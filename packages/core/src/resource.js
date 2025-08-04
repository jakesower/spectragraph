import Ajv from "ajv";
import addFormats from "ajv-formats";
import addErrors from "ajv-errors";
import { defaultExpressionEngine } from "@data-prism/expressions";
import { mapValues, omit } from "lodash-es";
import { normalizeQuery } from "./query.js";
import jsonSchema from "./fixtures/json-schema-draft-07.json" with { type: "json" };

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
 * @typedef {Ref} DeleteResource
 */

export const defaultValidator = new Ajv({
	allErrors: true,
	allowUnionTypes: true,
});
// defaultValidator.addSchema(jsonSchema, jsonSchema.$id);
addFormats(defaultValidator);
addErrors(defaultValidator);

const resourceValidationProperties = (schema, resource) => {
	const resSchema = schema.resources[resource.type];
	const requiredRelationships = resSchema.requiredRelationships ?? [];

	return {
		type: { const: resource.type },
		id: { type: "string" },
		attributes: {
			type: "object",
			required: resSchema.requiredAttributes,
			properties: resSchema.attributes,
			additionalProperties: {
				not: true,
				errorMessage:
					"attributes must not have extra properties; extra property is ${0#}",
			},
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

/**
 * Validate the contents of an entire graph.
 * @param {import('./schema.js').Schema} schema
 * @param {} graph
 */
export const validateNormalResource = (schema, resource) => {
	if (typeof resource !== "object" || Array.isArray(resource)) {
		throw new Error(
			"[data-prism] [validateNormalResource] - a resource must be an object",
		);
	}

	const { type, id, attributes, relationships, requiredAttributes } = resource;
	const resDef = schema.resources[type];

	if (!type || Object.keys(schema.resources).includes(type)) {
		throw new Error(
			"[data-prism] [validateNormalResource] - a resource must have a valid type",
		);
	}

	if (!id) {
		throw new Error(
			"[data-prism] [validateNormalResource] - a resource must have an id",
		);
	}

	if (
		!attributes ||
		typeof attributes !== "object" ||
		Array.isArray(attributes)
	) {
		throw new Error(
			"[data-prism] [validateNormalResource] - a resource must have an attributes object",
		);
	}

	const attributeSet = new Set(Object.keys(resDef.attributes));
	const requiredAttributesSet = new Set(requiredAttributes ?? []);

	Object.keys(attributes).forEach((attrName) => {
		if (!attributeSet.has(attrName)) {
			throw new Error(
				`[data-prism] [validateNormalResource] - ${attrName} is an invalid attribute on a resource of type ${type}`,
			);
		}
	});

	Object.entries(resDef.attributes).forEach(([attrName, attrDef]) => {
		if (
			resource[attrName] === undefined &&
			requiredAttributesSet.has(attrName)
		) {
			throw new Error(
				`[data-prism] [validateNormalResource] - ${attrName} is a required attribute and is missing`,
			);
		}
	});

	if (
		!relationships ||
		typeof relationships !== "object" ||
		Array.isArray(relationships)
	) {
		throw new Error(
			"[data-prism] [validateNormalResource] - a resource must have a relationships object",
		);
	}
};

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

/**
 * Validates a create resource operation
 * @param {import('./schema.js').Schema} schema - The schema to validate against
 * @param {CreateResource} resource - The resource to validate
 * @param {Ajv} [validator] - The validator instance to use
 * @returns {import('ajv').DefinedError[]} Array of validation errors
 */
export function validateCreateResource(
	schema,
	resource,
	validator = defaultValidator,
) {
	const validateBasis = validator.compile({
		type: "object",
		required: ["type"],
		properties: {
			type: { enum: Object.keys(schema.resources) },
		},
	});
	if (!validateBasis(resource)) return validateBasis.errors;

	const resSchema = schema.resources[resource.type];

	const required = ["type"];
	if ((resSchema.requiredAttributes ?? []).length > 0)
		required.push("attributes");
	if ((resSchema.requiredRelationships ?? []).length > 0)
		required.push("relationships");

	const validationSchema = {
		type: "object",
		required,
		properties: resourceValidationProperties(schema, resource),
	};

	const validate = validator.compile(validationSchema);
	return validate(resource) ? [] : validate.errors;
}

/**
 * Validates an update resource operation
 * @param {import('./schema.js').Schema} schema - The schema to validate against
 * @param {UpdateResource} resource - The resource to validate
 * @param {Ajv} [validator] - The validator instance to use
 * @returns {import('ajv').DefinedError[]} Array of validation errors
 */
export function validateUpdateResource(
	schema,
	resource,
	validator = defaultValidator,
) {
	const validateBasis = validator.compile({
		type: "object",
		required: ["type", "id"],
		properties: {
			type: { enum: Object.keys(schema.resources) },
			id: { type: "string" },
		},
	});
	if (!validateBasis(resource)) return validateBasis.errors;

	const validationSchema = {
		type: "object",
		required: ["type", "id"],
		properties: resourceValidationProperties(schema, resource),
	};

	const validate = validator.compile(validationSchema);
	return validate(resource) ? [] : validate.errors;
}

/**
 * Validates a delete resource operation
 * @param {import('./schema.js').Schema} schema - The schema to validate against
 * @param {DeleteResource} resource - The resource to validate
 * @param {Ajv} [validator] - The validator instance to use
 * @returns {Array} Array of validation errors
 */
export function validateDeleteResource(
	schema,
	resource,
	validator = defaultValidator,
) {
	const validateBasis = validator.compile({
		type: "object",
		required: ["type", "id"],
		properties: {
			type: { enum: Object.keys(schema.resources) },
			id: { type: "string" },
		},
	});

	return validateBasis(resource) ? [] : validateBasis.errors;
}

/**
 * Validates a resource tree that will be spliced into a graph
 * @param {import('./schema.js').Schema} schema - The schema to validate against
 * @param {*} resource - The resource tree to validate
 * @param {Ajv} [validator] - The validator instance to use
 * @returns {import('ajv').DefinedError[]} Array of validation errors
 */
export function validateSpliceResourceTree(
	schema,
	resource,
	validator = defaultValidator,
) {
	const basisSchema = {
		type: "object",
		required: ["type"],
		properties: {
			type: { enum: Object.keys(schema.resources) },
		},
	};
	const validateBasis = validator.compile(basisSchema);
	if (!validateBasis(resource)) return validateBasis.errors;

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

	const validationSchema = {
		$ref:
			resource.id && !resource.new
				? `#/definitions/update/${resource.type}`
				: `#/definitions/create/${resource.type}`,
		definitions,
	};

	const validate = validator.compile(validationSchema);
	if (!validate(resource)) return validate.errors;
	return [];
}

/**
 * Validates a query result
 * @param {import('./schema.js').Schema} schema - The schema to validate against
 * @param {import('./query.js').RootQuery}
 * @param {*} result - The resource tree to validate
 * * @param {Ajv} [validator] - The validator instance to use
 * @returns {void}
 * @throws {Error} If the resource tree is invalid
 */
export function ensureValidQueryResult(
	schema,
	rootQuery,
	result,
	validator = defaultValidator,
) {
	const normalQuery = normalizeQuery(schema, rootQuery);

	const queryDefinition = (query) => ({
		type: "object",
		required: Object.keys(query.select),
		properties: mapValues(query.select, (def, prop) => {
			const resDef = schema.resources[query.type];

			if (defaultExpressionEngine.isExpression(def)) return {};

			if (typeof def === "string")
				return omit(resDef.attributes[def], ["required"]);

			const relDef = resDef.relationships[prop];
			return relDef.cardinality === "one"
				? { oneOf: [{ type: "null" }, queryDefinition(def)] }
				: { type: "array", items: queryDefinition(def) };
		}),
	});

	const validationSchema = normalQuery.id
		? { oneOf: [queryDefinition(normalQuery), { type: "null" }] }
		: {
				type: "array",
				items: queryDefinition(normalQuery),
			};
	const validate = validator.compile(validationSchema);

	if (!validate(result)) {
		throw new Error(
			"there was a problem with the result (see [this error].cause for details)",
			{
				cause: validate.errors,
			},
		);
	}
}
