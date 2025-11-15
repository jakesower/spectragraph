import Ajv from "ajv";
import addFormats from "ajv-formats";
import addErrors from "ajv-errors";
import { applyOrMap } from "@spectragraph/utils";
import { mapValues, omit, pickBy } from "es-toolkit";
import { normalizeQuery } from "./query/normalize-query.js";
import { createDeepCache, ensure, translateAjvErrors } from "./lib/helpers.js";
import { validateSchema } from "./schema.js";
import { buildAttribute } from "./resource-helpers.js";
import { defaultSelectEngine, defaultValidator } from "./lib/defaults.js";

/**
 * @typedef {Object} Ref
 * @property {string} type
 * @property {string|number} id
 */

/**
 * @typedef {Object} FlatResource - An object with combined attributes and relationships. Relationships should be IDs or Refs.
 */

/**
 * @typedef {Object} BaseResource
 * @property {string} type
 */

/**
 * @typedef {BaseResource & {
 *   id: string|number,
 *   attributes: Object<string, *>,
 *   relationships: Object<string, Ref|Ref[]|null>,
 * }} NormalResource
 */

/**
 * @typedef {BaseResource & {
 *   id?: string|number,
 *   attributes?: Object<string, *>,
 *   relationships?: Object<string, Ref|Ref[]|null>,
 * }} PartialNormalResource
 */

/**
 * @typedef {Object} CreateResource - A partial normalized resource for creation (without required id)
 * @property {string} type - The resource type
 * @property {number|string} [id] - Optional ID for creation
 * @property {true} [new] - Flag indicating this is a new resource
 * @property {Object<string, *>} [attributes] - Optional attributes
 * @property {Object<string, Ref|Ref[]|null>} [relationships] - Optional relationships
 */

/**
 * @typedef {Object} UpdateResource - A normalized resource for updates (requires id)
 * @property {string} type - The resource type
 * @property {number|string} id - Required ID for updates
 * @property {false} [new] - Flag indicating this is an existing resource
 * @property {Object<string, *>} [attributes] - Optional attributes to update
 * @property {Object<string, Ref|Ref[]|null>} [relationships] - Optional relationships to update
 */

/**
 * @typedef {Object} DeleteResource - A resource reference for deletion
 * @property {string} type - The resource type
 * @property {string|number} id - The resource ID
 * @property {Object<string, *>} [attributes] - Optional attributes (for optimistic deletion)
 * @property {Object<string, Ref|Ref[]|null>} [relationships] - Optional relationships (for optimistic deletion)
 */

/**
 * @typedef {Object} Store
 * @property {function(CreateResource): Promise<NormalResource>} create - Creates a new resource
 * @property {function(UpdateResource): Promise<NormalResource>} update - Updates an existing resource
 * @property {function(DeleteResource): Promise<DeleteResource>} delete - Deletes a resource
 * @property {function(CreateResource | UpdateResource): Promise<NormalResource>} upsert - Creates or updates a resource
 * @property {function(import('./query.js').RootQuery): Promise<*>} query - Queries the store
 */

const getIdType = (schema, resourceType) =>
	schema.resources[resourceType]?.attributes[
		schema.resources[resourceType]?.idAttribute ?? "id"
	]?.type;

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
		id: { type: getIdType(schema, resource.type) },
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
									id: { type: getIdType(schema, relSchema.type) },
								},
							}
						: {
								oneOf: [
									{
										type: "object",
										required: ["type", "id"],
										properties: {
											type: { const: relSchema.type },
											id: { type: getIdType(schema, relSchema.type) },
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
									id: { type: getIdType(schema, relSchema.type) },
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
const getMergeResourceCache = createDeepCache();
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

	if (typeof schema !== "object") {
		return [
			{ message: "Invalid schema: expected object, got " + typeof schema },
		];
	}
	if (typeof validator !== "object") {
		return [
			{
				message: "Invalid validator: expected object, got " + typeof validator,
			},
		];
	}
	if (!resource.type || !(resource.type in schema.resources)) {
		return [
			{
				message: `Invalid resource type "${resource.type}": not defined in schema`,
			},
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
 * Converts a flat resource object to normalized form with type/id/attributes/relationships structure.
 *
 * Flat resources have attributes and relationship IDs mixed at the root level.
 * Normalized resources separate them into explicit attributes and relationships objects,
 * with relationships converted to {type, id} reference objects.
 *
 * @param {import('./schema.js').Schema} schema - The schema defining the resource structure
 * @param {string} resourceType - The type of resource to normalize
 * @param {FlatResource} resource - The flat resource with mixed attributes and relationships
 * @returns {NormalResource} Normalized resource with separated attributes and relationships
 */
export function normalizeResource(schema, resourceType, resource) {
	const resSchema = schema.resources[resourceType];

	const attributes = mapValues(
		resSchema.attributes,
		(_, attr) => resource[attr],
	);

	const relationships = mapValues(resSchema.relationships, (relSchema, rel) => {
		const emptyRel = relSchema.cardinality === "many" ? [] : null;
		const relResSchema = schema.resources[relSchema.type];

		if (resource[rel] === undefined) {
			return undefined;
		}

		return applyOrMap(resource[rel] ?? emptyRel, (relRes) =>
			typeof relRes === "object"
				? {
						type: relSchema.type,
						id: relRes[relResSchema.idAttribute] ?? relRes.id,
					}
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
 * Creates a flat resource with schema defaults applied
 * @param {import('./schema.js').Schema} schema - The schema to use for defaults
 * @param {string} resourceType - The type of resource to create
 * @param {FlatResource} [partialResource] - The partial resource to create from
 * @param {Object} [options]
 * @param {boolean} [options.includeRelationships=true] - Whether to include default values for relationships not present in partialResource. When false, only relationships explicitly provided in partialResource will be included (useful when relationships will be linked later via linkInverses).
 * @returns {FlatResource} A complete flat resource with defaults applied
 */
export function buildResource(
	schema,
	resourceType,
	partialResource = {},
	options = {},
) {
	const { includeRelationships = true } = options;
	const resSchema = schema.resources[resourceType];

	const builtAttributes = mapValues(
		resSchema.attributes,
		(attrSchema, attrName) =>
			buildAttribute(attrSchema, partialResource[attrName]),
	);

	const defaultRelationships = includeRelationships
		? mapValues(resSchema.relationships, (relSchema, relName) =>
				partialResource[relName] === undefined
					? relSchema.cardinality === "one"
						? null
						: []
					: partialResource[relName],
			)
		: {};

	return {
		...defaultRelationships,
		...partialResource,
		...builtAttributes,
	};
}

/**
 * Creates a normalized resource with schema defaults applied
 * @param {import('./schema.js').Schema} schema - The schema to use for defaults
 * @param {string} resourceType - The type of resource to create
 * @param {FlatResource} [partialResource] - The partial resource to create from
 * @param {Object} [options]
 * @param {boolean} [options.includeRelationships=true] - Whether to include default values for relationships not present in partialResource. When false, only relationships explicitly provided in partialResource will be included (useful when relationships will be linked later via linkInverses).
 * @returns {NormalResource} A complete normalized resource with defaults applied
 */
export function buildNormalResource(
	schema,
	resourceType,
	partialResource = {},
	options = {},
) {
	const { includeRelationships = true } = options;
	const flat = buildResource(schema, resourceType, partialResource, options);
	const normalized = normalizeResource(schema, resourceType, flat);

	// If includeRelationships is false, only keep explicitly provided relationships
	if (!includeRelationships) {
		normalized.relationships = pickBy(
			normalized.relationships,
			(_, relName) => partialResource[relName] !== undefined,
		);
	}

	return normalized;
}

/**
 * Creates a normalized resource with schema defaults applied. The right side's values overwrite the left's.
 *
 * @param {import('./schema.js').Schema} schema - The schema to use for defaults
 * @param {PartialNormalResource} left - One resource to merge
 * @param {PartialNormalResource} right - The other resource to merge
 * @returns {PartialNormalResource} A partial normalized resource with the id, attributes, and relationships from left and right merged
 */
export function mergeNormalResources(left, right) {
	if (left.type !== right.type) {
		throw new Error("only resources of the same type can be merged");
	}

	if (left.id && right.id && left.id !== right.id) {
		throw new Error("only resources with the same ID can be merged");
	}

	return {
		type: left.type,
		id: left.id ?? right.id,
		attributes: { ...(left.attributes ?? {}), ...(right.attributes ?? {}) },
		relationships: {
			...(left.relationships ?? {}),
			...(right.relationships ?? {}),
		},
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

	if (typeof schema !== "object") {
		return [
			{ message: "Invalid schema: expected object, got " + typeof schema },
		];
	}
	if (typeof validator !== "object") {
		return [
			{
				message: "Invalid validator: expected object, got " + typeof validator,
			},
		];
	}
	if (!resource.type || !(resource.type in schema.resources)) {
		return [
			{
				message: `Invalid resource type "${resource.type}": not defined in schema`,
			},
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
		if ((resSchema.requiredAttributes ?? []).length > 0) {
			required.push("attributes");
		}
		if ((resSchema.requiredRelationships ?? []).length > 0) {
			required.push("relationships");
		}

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

	if (typeof schema !== "object") {
		return [
			{ message: "Invalid schema: expected object, got " + typeof schema },
		];
	}
	if (typeof validator !== "object") {
		return [
			{
				message: "Invalid validator: expected object, got " + typeof validator,
			},
		];
	}
	if (!resource.type || !(resource.type in schema.resources)) {
		return [
			{
				message: `Invalid resource type "${resource.type}": not defined in schema`,
			},
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
		if ((resSchema.requiredAttributes ?? []).length > 0) {
			required.push("attributes");
		}
		if ((resSchema.requiredRelationships ?? []).length > 0) {
			required.push("relationships");
		}

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
	const idType = getIdType(schema, resource.type);

	if (typeof schema !== "object") {
		return [
			{ message: "Invalid schema: expected object, got " + typeof schema },
		];
	}
	if (typeof resource !== "object") {
		return [
			{ message: "Invalid resource: expected object, got " + typeof resource },
		];
	}
	if (!resource.type || !(resource.type in schema.resources)) {
		return [
			{
				message: `Invalid resource type "${resource.type}": not defined in schema`,
			},
		];
	}
	if (!resource.id) {
		return [{ message: "Missing resource ID: required for delete operation" }];
	}
	if (typeof resource.id !== (idType === "integer" ? "number" : "string")) {
		return [
			{ message: "Wrong resource ID type: required for delete operation" },
		];
	}

	return [];
}

/**
 * Validates a resource tree that will be merged into a graph
 *
 * @param {import('./schema.js').Schema} schema - The schema to validate against
 * @param {*} resource - The resource tree to validate
 * @param {Object} [options]
 * @param {Ajv} [options.validator] - The validator instance to use
 * @returns {import('ajv').DefinedError[]} Array of validation errors
 */
export function validateMergeResource(schema, resource, options = {}) {
	const { validator = defaultValidator } = options;

	if (typeof schema !== "object") {
		return [
			{ message: "Invalid schema: expected object, got " + typeof schema },
		];
	}
	if (typeof validator !== "object") {
		return [
			{
				message: "Invalid validator: expected object, got " + typeof validator,
			},
		];
	}
	if (!resource.type || !(resource.type in schema.resources)) {
		return [
			{
				message: `Invalid resource type "${resource.type}": not defined in schema`,
			},
		];
	}

	const cache = getMergeResourceCache(schema, validator);
	let schemaCache = cache.value;
	if (!schemaCache) {
		schemaCache = new Map(); // Cache by resource type
		cache.set(schemaCache);
	}

	let compiledValidators = schemaCache.get(resource.type);
	if (!compiledValidators) {
		const toOneRefOfType = (type, required) => ({
			anyOf: [
				...(required ? [] : [{ type: "null" }]),
				{
					type: "object",
					required: ["type", "id"],
					additionalProperties: false,
					properties: {
						type: { const: type },
						id: { type: ["string", "integer"] },
					},
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
			if ((resSchema.requiredAttributes ?? []).length > 0) {
				required.push("attributes");
			}
			if ((resSchema.requiredRelationships ?? []).length > 0) {
				required.push("relationships");
			}

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
					id: { type: ["string", "integer"] },
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

		compiledValidators = {
			create: validator.compile({
				$ref: `#/definitions/create/${resource.type}`,
				definitions,
			}),
			update: validator.compile({
				$ref: `#/definitions/update/${resource.type}`,
				definitions,
			}),
		};

		schemaCache.set(resource.type, compiledValidators);
	}

	const compiledValidator =
		resource.id && !resource.new
			? compiledValidators.update
			: compiledValidators.create;

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
 * @param {import('./lib/defaults.js').SelectExpressionEngine} [options.selectEngine] - Expression engine for SELECT clause validation
 * @return {import('./lib/helpers.js').StandardError[]}
 */
export function validateQueryResult(schema, rootQuery, result, options = {}) {
	const { selectEngine = defaultSelectEngine, validator = defaultValidator } =
		options;

	ensure(validateSchema)(schema, options);

	if (typeof validator !== "object") {
		return [
			{
				message: "Invalid validator: expected object, got " + typeof validator,
			},
		];
	}
	if (typeof rootQuery !== "object") {
		return [
			{ message: "Invalid query: expected object, got " + typeof rootQuery },
		];
	}
	// check for the special case of a null result to improve error quality
	if (rootQuery.id && result === null) {
		return [];
	}

	const cache = getValidateQueryResultCache(schema, validator, rootQuery);
	let compiledValidator = cache.value;
	if (!compiledValidator) {
		const normalQuery = normalizeQuery(schema, rootQuery);

		const queryDefinition = (query) => ({
			type: "object",
			required: Object.keys(query.select),
			properties: mapValues(query.select, (def, prop) => {
				const resDef = schema.resources[query.type];

				if (selectEngine.isExpression(def)) return {};

				if (typeof def === "string") {
					return { ...resDef.attributes[def] };
				}

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
