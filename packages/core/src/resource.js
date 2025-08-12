import Ajv from "ajv";
import addFormats from "ajv-formats";
import addErrors from "ajv-errors";
import { applyOrMap } from "@data-prism/utils";
import { defaultExpressionEngine } from "@data-prism/expressions";
import { mapValues, omit, pickBy } from "lodash-es";
import { normalizeQuery } from "./query.js";
import { createDeepCache, ensure, translateAjvErrors } from "./lib/helpers.js";
import { validateSchema } from "./schema.js";

/**
 * @typedef {Object} Ref
 * @property {string} type
 * @property {string} id
 */

/**
 * @typedef {Object} BaseResource
 * @property {string} type
 */

/**
 * @typedef {BaseResource & {
 *   id: string,
 *   attributes: Object<string, *>,
 *   relationships: Object<string, Ref|Ref[]|null>,
 * }} NormalResource
 */

/**
 * @typedef {BaseResource & {
 *   id?: number|string,
 *   new?: true,
 *   attributes?: Object<string, *>,
 *   relationships?: Object<string, Ref|Ref[]|null>,
 * }} CreateResource
 */

/**
 * @typedef {BaseResource & {
 *   id: number|string,
 *   new?: false,
 *   attributes?: Object<string, *>,
 *   relationships?: Object<string, Ref|Ref[]|null>,
 * }} UpdateResource

/**
 * @typedef {Ref & {
 *   attributes?: Object<string, *>,
 *   relationships?: Object<string, Ref|Ref[]|null>,
 * }} DeleteResource
 */

export const defaultValidator = new Ajv({
	allErrors: true,
	allowUnionTypes: true,
});
addFormats(defaultValidator);
addErrors(defaultValidator);

/**
 * Creates a new validator instance
 * @param {Object} options
 * @param {Array} [options.ajvSchemas] - Additional schemas to add
 * @returns {Ajv} Configured validator instance
 */
export const createValidator = ({ ajvSchemas = [] } = {}) => {
	const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
	addFormats(ajv);
	addErrors(ajv);

	ajvSchemas.forEach((schema) => ajv.addSchema(schema, schema.$id));

	return ajv;
};

const resourceValidationProperties = (schema, resource, options = {}) => {
	const { allowExtraAttributes = false } = options;

	const resSchema = schema.resources[resource.type];
	const requiredRelationships = resSchema.requiredRelationships ?? [];

	return {
		type: { const: resource.type },
		id: { type: "string" },
		attributes: {
			type: "object",
			required: resSchema.requiredAttributes ?? [],
			properties: resSchema.attributes,
			...(allowExtraAttributes
				? {}
				: {
						additionalProperties: {
							not: true,
							errorMessage:
								"attributes must not have extra properties; extra property is ${0#}",
						},
					}),
		},
		relationships: {
			type: "object",
			required: resSchema.requiredRelationships,
			additionalProperties: false,
			properties: mapValues(resSchema.relationships, (relSchema, relName) =>
				relSchema.cardinality === "one"
					? requiredRelationships.includes(relName)
						? {
								type: "object",
								required: ["type", "id"],
								properties: {
									type: { const: relSchema.type },
									id: { type: "string" },
								},
							}
						: {
								oneOf: [
									{
										type: "object",
										required: ["type", "id"],
										properties: {
											type: { const: relSchema.type },
											id: { type: "string" },
										},
									},
									{ type: "null" },
								],
							}
					: {
							type: "array",
							items: {
								type: "object",
								required: ["type", "id"],
								properties: {
									type: { const: relSchema.type },
									id: { type: "string" },
								},
							},
						},
			),
		},
	};
};

const getNormalResourceCache = createDeepCache();
const getCreateResourceCache = createDeepCache();
const getUpdateResourceCache = createDeepCache();
const getSpliceResourceCache = createDeepCache();
const getValidateQueryResultCache = createDeepCache();

/**
 * Validates a normal resource.
 *
 * @param {import('./schema.js').Schema} schema
 * @param {NormalResource} resource
 * @param {Object} [options={}]
 * @param {boolean} [options.allowExtraAttributes=false]
 * @param {Ajv} [options.validator] - The validator instance to use
 * @return {Error[]} - errors found in validation, empty array means validation has been passed
 */
export const validateNormalResource = (schema, resource, options = {}) => {
	const { validator = defaultValidator } = options;

	if (typeof schema !== "object")
		return [{ message: "[data-prism] schema must be an object" }];
	if (typeof validator !== "object")
		return [{ message: "[data-prism] validator must be an object" }];
	if (!resource.type || !(resource.type in schema.resources)) {
		return [
			{ message: `[data-prism] ${resource.type} is not a valid resource type` },
		];
	}

	const cache = getNormalResourceCache(schema, validator);
	let schemaCache = cache;
	let compiledValidator = schemaCache.value;
	if (!compiledValidator) {
		const validationSchema = {
			type: "object",
			required: ["type", "id", "attributes", "relationships"],
			properties: resourceValidationProperties(
				schema,
				{ type: resource.type },
				options,
			),
		};

		compiledValidator = validator.compile(validationSchema);
		schemaCache.set(compiledValidator);
	}

	return compiledValidator(resource)
		? []
		: translateAjvErrors(compiledValidator.errors, resource, "resource");
};

/**
 * Converts a resource object to normal form.
 *
 * @param {string} resourceType
 * @param {Object<string, unknown>} resource
 * @param {import('./schema.js').Schema} schema
 * @param {Object} [options={}]
 * @param {boolean} [options.allowExtraAttributes=false]
 * @param {boolean} [options.skipValidation=false]
 * @param {Ajv} [options.validator] - The validator instance to use
 * @returns {NormalResource}
 */
export function normalizeResource(schema, resourceType, resource) {
	const resSchema = schema.resources[resourceType];

	const attributes = mapValues(
		resSchema.attributes,
		(_, attr) => resource[attr],
	);

	const relationships = mapValues(resSchema.relationships, (relSchema, rel) => {
		const relResSchema = schema.resources[relSchema.type];
		const emptyRel = relSchema.cardinality === "many" ? [] : null;
		const relIdField = relResSchema.idAttribute ?? "id";

		if (resource[rel] === undefined) return undefined;

		return applyOrMap(resource[rel] ?? emptyRel, (relRes) =>
			typeof relRes === "object"
				? { type: relSchema.type, id: relRes[relIdField] }
				: { type: relSchema.type, id: relRes },
		);
	});

	return {
		type: resourceType,
		id: resource[resSchema.idAttribute ?? "id"],
		attributes: pickBy(attributes, (a) => a !== undefined),
		relationships: pickBy(relationships, (r) => r !== undefined),
	};
}

/**
 * Validates a create resource operation
 * @param {import('./schema.js').Schema} schema - The schema to validate against
 * @param {CreateResource} resource - The resource to validate
 * @param {Object} [options]
 * @param {Ajv} [options.validator] - The validator instance to use
 * @returns {import('ajv').DefinedError[]} Array of validation errors
 */
export function validateCreateResource(schema, resource, options = {}) {
	const { validator = defaultValidator } = options;

	if (typeof schema !== "object")
		return [{ message: "[data-prism] schema must be an object" }];
	if (typeof validator !== "object")
		return [{ message: "[data-prism] validator must be an object" }];
	if (!resource.type || !(resource.type in schema.resources)) {
		return [
			{ message: `[data-prism] ${resource.type} is not a valid resource type` },
		];
	}

	const cache = getCreateResourceCache(schema, validator);
	let schemaCache = cache.value;
	if (!schemaCache) {
		schemaCache = new Map(); // Cache by resource type
		cache.set(schemaCache);
	}

	let compiledValidator = schemaCache.get(resource.type);
	if (!compiledValidator) {
		const resSchema = schema.resources[resource.type];
		const required = ["type"];
		if ((resSchema.requiredAttributes ?? []).length > 0)
			required.push("attributes");
		if ((resSchema.requiredRelationships ?? []).length > 0)
			required.push("relationships");

		compiledValidator = validator.compile({
			type: "object",
			required,
			properties: resourceValidationProperties(schema, { type: resource.type }),
		});

		schemaCache.set(resource.type, compiledValidator);
	}

	return compiledValidator(resource)
		? []
		: translateAjvErrors(compiledValidator.errors, resource, "resource");
}

/**
 * Validates an update resource operation
 * @param {import('./schema.js').Schema} schema - The schema to validate against
 * @param {UpdateResource} resource - The resource to validate
 * @param {Object} [options]
 * @param {Ajv} [options.validator] - The validator instance to use
 * @returns {import('ajv').DefinedError[]} Array of validation errors
 */
export function validateUpdateResource(schema, resource, options = {}) {
	const { validator = defaultValidator } = options;

	if (typeof schema !== "object")
		return [{ message: "[data-prism] schema must be an object" }];
	if (typeof validator !== "object")
		return [{ message: "[data-prism] validator must be an object" }];
	if (!resource.type || !(resource.type in schema.resources)) {
		return [
			{ message: `[data-prism] ${resource.type} is not a valid resource type` },
		];
	}

	const cache = getUpdateResourceCache(schema, validator);
	let schemaCache = cache.value;
	if (!schemaCache) {
		schemaCache = new Map(); // Cache by resource type
		cache.set(schemaCache);
	}

	let compiledValidator = schemaCache.get(resource.type);
	if (!compiledValidator) {
		const resSchema = schema.resources[resource.type];
		const required = ["type"];
		if ((resSchema.requiredAttributes ?? []).length > 0)
			required.push("attributes");
		if ((resSchema.requiredRelationships ?? []).length > 0)
			required.push("relationships");

		compiledValidator = validator.compile({
			type: "object",
			required: ["type", "id"],
			properties: resourceValidationProperties(schema, { type: resource.type }),
		});

		schemaCache.set(resource.type, compiledValidator);
	}

	return compiledValidator(resource)
		? []
		: translateAjvErrors(compiledValidator.errors, resource, "resource");
}

/**
 * Validates a delete resource operation
 * @param {import('./schema.js').Schema} schema - The schema to validate against
 * @param {DeleteResource} resource - The resource to validate
 * @returns {Array} Array of validation errors
 */
export function validateDeleteResource(schema, resource) {
	if (typeof schema !== "object")
		return [{ message: "[data-prism] schema must be an object" }];
	if (typeof resource !== "object")
		return [{ message: "[data-prism] resource must be an object" }];
	if (!resource.type || !(resource.type in schema.resources))
		return [{ message: "[data-prism] resource must have a valid type" }];
	if (!resource.id)
		return [{ message: "[data-prism] resource must have a valid ID" }];

	return [];
}

/**
 * Validates a resource tree that will be spliced into a graph
 *
 * @param {import('./schema.js').Schema} schema - The schema to validate against
 * @param {*} resource - The resource tree to validate
 * @param {Object} [options]
 * @param {Ajv} [options.validator] - The validator instance to use
 * @returns {import('ajv').DefinedError[]} Array of validation errors
 */
export function validateSpliceResource(schema, resource, options = {}) {
	const { validator = defaultValidator } = options;

	if (typeof schema !== "object")
		return [{ message: "[data-prism] schema must be an object" }];
	if (typeof validator !== "object")
		return [{ message: "[data-prism] validator must be an object" }];
	if (!resource.type || !(resource.type in schema.resources)) {
		return [
			{ message: `[data-prism] ${resource.type} is not a valid resource type` },
		];
	}

	const cache = getSpliceResourceCache(schema, validator);
	let schemaCache = cache.value;
	if (!schemaCache) {
		schemaCache = new Map(); // Cache by resource type
		cache.set(schemaCache);
	}

	let compiledValidator = schemaCache.get(resource.type);
	if (!compiledValidator) {
		const toOneRefOfType = (type, required) => ({
			anyOf: [
				...(required ? [] : [{ type: "null" }]),
				{
					type: "object",
					required: ["type", "id"],
					additionalProperties: false,
					properties: { type: { const: type }, id: { type: "string" } },
				},
				{ $ref: `#/definitions/create/${type}` },
				{ $ref: `#/definitions/update/${type}` },
			],
		});
		const toManyRefOfType = (type) => ({
			type: "array",
			items: toOneRefOfType(type, true),
		});

		const definitions = { create: {}, update: {} };
		Object.entries(schema.resources).forEach(([resName, resSchema]) => {
			const required = ["type"];
			if ((resSchema.requiredAttributes ?? []).length > 0)
				required.push("attributes");
			if ((resSchema.requiredRelationships ?? []).length > 0)
				required.push("relationships");

			const requiredRelationships = resSchema.requiredRelationships ?? [];

			definitions.create[resName] = {
				type: "object",
				required,
				additionalProperties: false,
				properties: {
					type: { const: resName },
					new: { type: "boolean", const: true },
					attributes: {
						type: "object",
						required: resSchema.requiredAttributes,
						additionalProperties: false,
						properties: resSchema.attributes,
					},
					relationships: {
						type: "object",
						required: requiredRelationships,
						additionalProperties: false,
						properties: mapValues(
							resSchema.relationships,
							(relSchema, resName) =>
								relSchema.cardinality === "one"
									? requiredRelationships.includes(resName)
										? toOneRefOfType(relSchema.type, true)
										: toOneRefOfType(relSchema.type, false)
									: toManyRefOfType(relSchema.type),
						),
					},
				},
			};

			definitions.update[resName] = {
				type: "object",
				required: ["type", "id"],
				additionalProperties: false,
				properties: {
					type: { const: resName },
					id: { type: "string" },
					new: { type: "boolean", const: false },
					attributes: {
						type: "object",
						additionalProperties: false,
						properties: mapValues(resSchema.attributes, (a) =>
							omit(a, ["required"]),
						),
					},
					relationships: {
						type: "object",
						additionalProperties: false,
						properties: mapValues(resSchema.relationships, (relSchema) =>
							relSchema.cardinality === "one"
								? relSchema.required
									? toOneRefOfType(relSchema.type, true)
									: toOneRefOfType(relSchema.type, false)
								: toManyRefOfType(relSchema.type),
						),
					},
				},
			};
		});

		compiledValidator = validator.compile({
			$ref:
				resource.id && !resource.new
					? `#/definitions/update/${resource.type}`
					: `#/definitions/create/${resource.type}`,
			definitions,
		});

		schemaCache.set(resource.type, compiledValidator);
	}

	return compiledValidator(resource)
		? []
		: translateAjvErrors(compiledValidator.errors, resource, "resource");
}

/**
 * Validates a query result. This function can be quite slow. It's recommended for use mostly in testing.
 *
 * @param {import('./schema.js').Schema} schema - The schema to validate against
 * @param {import('./query.js').RootQuery} query - The query run to produce the result
 * @param {Object|Object[]} result - The resource tree to validate
 * @param {Object} [options]
 * @param {Ajv} [options.validator] - The validator instance to use
 * @return {import('./lib/helpers.js').StandardError[]}
 */
export function validateQueryResult(schema, rootQuery, result, options = {}) {
	const { validator = defaultValidator } = options;

	ensure(validateSchema)(schema, options);

	if (typeof validator !== "object")
		return [{ message: "[data-prism] validator must be an object" }];
	if (typeof rootQuery !== "object")
		return [{ message: "[data-prism] query must be an object" }];

	// check for the special case of a null result to improve error quality
	if (rootQuery.id && result === null) return [];

	const cache = getValidateQueryResultCache(schema, validator, rootQuery);
	let compiledValidator = cache.value;
	if (!compiledValidator) {
		const normalQuery = normalizeQuery(schema, rootQuery);

		const queryDefinition = (query) => ({
			type: "object",
			required: Object.keys(query.select),
			properties: mapValues(query.select, (def, prop) => {
				const resDef = schema.resources[query.type];

				if (defaultExpressionEngine.isExpression(def)) return {};

				if (typeof def === "string") return { ...resDef.attributes[def] };

				const relDef = resDef.relationships[prop];
				return relDef.cardinality === "one"
					? queryDefinition(def)
					: { type: "array", items: queryDefinition(def) };
			}),
		});

		const validationSchema = normalQuery.id
			? queryDefinition(normalQuery)
			: {
					type: "array",
					items: queryDefinition(normalQuery),
				};

		compiledValidator = validator.compile(validationSchema);
		cache.set(compiledValidator);
	}

	return compiledValidator(result)
		? []
		: translateAjvErrors(compiledValidator.errors, result, "resource");
}
