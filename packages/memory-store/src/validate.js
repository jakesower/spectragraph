import Ajv from "ajv";
import addFormats from "ajv-formats";
import { mapValues, omit } from "lodash-es";
import { columnTypeModifiers } from "./lib/column-type-modifiers.js";

/**
 * @typedef {Object} CreateResource
 * @property {string} type
 * @property {number|string} [id]
 * @property {Object<string, *>} [attributes]
 * @property {Object<string, import('./graph.js').Ref|import('./graph.js').Ref[]|null>} [relationships]
 */

/**
 * @typedef {Object} UpdateResource
 * @property {string} type
 * @property {number|string} id
 * @property {Object<string, *>} [attributes]
 * @property {Object<string, import('./graph.js').Ref|import('./graph.js').Ref[]|null>} [relationships]
 */

/**
 * @typedef {import('./graph.js').Ref} DeleteResource
 */

export const defaultValidator = new Ajv();
addFormats(defaultValidator);

/**
 * Creates a new validator instance
 * @param {Object} options
 * @param {Array} [options.ajvSchemas] - Additional schemas to add
 * @returns {Ajv} Configured validator instance
 */
export const createValidator = ({ ajvSchemas = [] } = {}) => {
	const ajv = new Ajv();
	addFormats(ajv);

	ajvSchemas.forEach((schema) => ajv.addSchema(schema, schema.$id));

	return ajv;
};

/**
 * Validates a create resource operation
 * @param {import('./schema.js').Schema} schema - The schema to validate against
 * @param {CreateResource} resource - The resource to validate
 * @param {Ajv} [validator] - The validator instance to use
 * @returns {Array} Array of validation errors
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
	const validationSchema = {
		type: "object",
		required: [
			"type",
			...(Object.keys(resSchema.attributes).some(
				(k) => resSchema.attributes[k].required,
			)
				? ["attributes"]
				: []),
			...(Object.keys(resSchema.relationships).some(
				(k) => resSchema.relationships[k].required,
			)
				? ["relationships"]
				: []),
		],
		properties: {
			type: { const: resource.type },
			id: { type: "string" },
			attributes: {
				type: "object",
				required: Object.keys(resSchema.attributes).filter(
					(k) => resSchema.attributes[k].required,
				),
				additionalProperties: false,
				properties: mapValues(resSchema.attributes, (a) => ({
					...omit(a, ["required", "subType"]),
					...(columnTypeModifiers[a.type]?.subTypes?.[a.subType]
						?.schemaProperties
						? columnTypeModifiers[a.type].subTypes[a.subType].schemaProperties
						: columnTypeModifiers[a.type]?.schemaProperties
							? columnTypeModifiers[a.type].schemaProperties
							: {}),
				})),
			},
			relationships: {
				type: "object",
				required: Object.keys(resSchema.relationships).filter(
					(k) => resSchema.relationships[k].required,
				),
				additionalProperties: false,
				properties: mapValues(resSchema.relationships, (relSchema) =>
					relSchema.cardinality === "one"
						? relSchema.required
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
		},
	};

	const validate = validator.compile(validationSchema);
	const castResource = {
		...resource,
		attributes: mapValues(resource.attributes, (v, k) => {
			const attrSchema = resSchema.attributes[k];
			const { castForValidation } =
				columnTypeModifiers[attrSchema?.type]?.subTypes?.[attrSchema.subType] ??
				columnTypeModifiers[attrSchema?.type] ??
				{};

			return castForValidation ? castForValidation(v) : v;
		}),
	};

	validate(castResource);
	if (!validate(castResource)) return validate.errors;

	return [];
}

/**
 * Validates an update resource operation
 * @param {import('./schema.js').Schema} schema - The schema to validate against
 * @param {UpdateResource} resource - The resource to validate
 * @param {Ajv} [validator] - The validator instance to use
 * @returns {Array} Array of validation errors
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

	const resSchema = schema.resources[resource.type];
	const validationSchema = {
		type: "object",
		required: ["type", "id"],
		properties: {
			type: { const: resource.type },
			id: { type: "string" },
			attributes: {
				type: "object",
				additionalProperties: false,
				properties: mapValues(resSchema.attributes, (a) => ({
					...omit(a, ["required", "subType"]),
					...(columnTypeModifiers[a.type]?.subTypes?.[a.subType]
						?.schemaProperties
						? columnTypeModifiers[a.type].subTypes[a.subType].schemaProperties
						: columnTypeModifiers[a.type]?.schemaProperties
							? columnTypeModifiers[a.type].schemaProperties
							: {}),
				})),
			},
			relationships: {
				type: "object",
				additionalProperties: false,
				properties: mapValues(resSchema.relationships, (relSchema) =>
					relSchema.cardinality === "one"
						? relSchema.required
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
		},
	};

	const validate = validator.compile(validationSchema);
	const castResource = {
		...resource,
		attributes: mapValues(resource.attributes, (v, k) => {
			const attrSchema = resSchema.attributes[k];
			const { castForValidation } =
				columnTypeModifiers[attrSchema?.type]?.subTypes?.[attrSchema.subType] ??
				columnTypeModifiers[attrSchema?.type] ??
				{};

			return castForValidation ? castForValidation(v) : v;
		}),
	};

	if (!validate(castResource)) return validate.errors;

	return [];
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
	if (!validateBasis(resource)) return validateBasis.errors;

	return [];
}

/**
 * Validates a resource tree
 * @param {import('./schema.js').Schema} schema - The schema to validate against
 * @param {*} resource - The resource tree to validate
 * @param {Ajv} [validator] - The validator instance to use
 * @returns {Array} Array of validation errors
 */
export function validateResourceTree(
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

	const resSchema = schema.resources[resource.type];

	const definitions = { create: {}, update: {} };
	Object.entries(schema.resources).forEach(([resName, resSchema]) => {
		const hasRequiredAttributes = Object.keys(resSchema.attributes).some(
			(k) => resSchema.attributes[k].required,
		);
		const hasRequiredRelationships = Object.keys(resSchema.relationships).some(
			(k) => resSchema.relationships[k].required,
		);

		const required = ["type"];
		if (hasRequiredAttributes) required.push("attributes");
		if (hasRequiredRelationships) required.push("relationships");
		definitions.create[resName] = {
			type: "object",
			required,
			additionalProperties: false,
			properties: {
				type: { const: resName },
				new: { type: "boolean", const: true },
				attributes: {
					type: "object",
					required: Object.keys(resSchema.attributes).filter(
						(k) => resSchema.attributes[k].required,
					),
					additionalProperties: false,
					properties: mapValues(resSchema.attributes, (a) => ({
						...omit(a, ["required", "subType"]),
						...(columnTypeModifiers[a.type]?.subTypes?.[a.subType]
							?.schemaProperties
							? columnTypeModifiers[a.type].subTypes[a.subType].schemaProperties
							: columnTypeModifiers[a.type]?.schemaProperties
								? columnTypeModifiers[a.type].schemaProperties
								: {}),
					})),
				},
				relationships: {
					type: "object",
					required: Object.keys(resSchema.relationships).filter(
						(k) => resSchema.relationships[k].required,
					),
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
					properties: mapValues(resSchema.attributes, (a) => ({
						...omit(a, ["required", "subType"]),
						...(columnTypeModifiers[a.type]?.subTypes?.[a.subType]
							?.schemaProperties
							? columnTypeModifiers[a.type].subTypes[a.subType].schemaProperties
							: columnTypeModifiers[a.type]?.schemaProperties
								? columnTypeModifiers[a.type].schemaProperties
								: {}),
					})),
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
		$ref: resource.id
			? `#/definitions/update/${resource.type}`
			: `#/definitions/create/${resource.type}`,
		definitions,
	};

	const validate = validator.compile(validationSchema);
	const castResource = {
		...resource,
		attributes: mapValues(resource.attributes, (v, k) => {
			const attrSchema = resSchema.attributes[k];
			const { castForValidation } =
				columnTypeModifiers[attrSchema?.type]?.subTypes?.[attrSchema.subType] ??
				columnTypeModifiers[attrSchema?.type] ??
				{};

			return castForValidation ? castForValidation(v) : v;
		}),
	};

	if (!validate(castResource)) return validate.errors;

	return [];
}
