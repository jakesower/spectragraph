import { mapValues, merge } from "lodash-es";
import { defaultValidator } from "./resource.js";
import { createDeepCache, translateAjvErrors } from "./lib/helpers.js";
import metaschema from "./fixtures/data-prism-schema.schema.json" with { type: "json" };

/**
 * @typedef {"object"|"array"|"boolean"|"string"|"number"|"integer"|"null"} JSONSchemaType
 */

/**
 * @typedef {Object} JSONSchema
 * @property {JSONSchemaType} [type]
 * @property {JSONSchema|JSONSchema[]} [items]
 * @property {Object<string, JSONSchema>} [properties]
 * @property {string[]} [required]
 * @property {boolean|JSONSchema} [additionalProperties]
 * @property {string} [$id]
 * @property {string} [$schema]
 * @property {string} [$ref]
 * @property {string} [title]
 * @property {string} [description]
 * @property {number} [minimum]
 * @property {number} [maximum]
 * @property {number} [minLength]
 * @property {number} [maxLength]
 * @property {number} [minItems]
 * @property {number} [maxItems]
 * @property {any[]} [enum]
 * @property {any} [const]
 * @property {JSONSchema[]} [oneOf]
 * @property {JSONSchema[]} [anyOf]
 * @property {JSONSchema[]} [allOf]
 * @property {Object<string, JSONSchema>} [patternProperties]
 * @property {string} [pattern]
 * @property {Object<string, *>} [definitions]
 * @property {Object<string, *>} [$defs]
 * @property {boolean} [readOnly]
 * @property {boolean} [writeOnly]
 * @property {string} [format]
 * @property {any} [default]
 */

/**
 * @typedef {Object} TypedObject
 * @property {JSONSchemaType} type
 */

/**
 * @typedef {Object} SchemaRelationship
 * @property {string} type
 * @property {"one"|"many"} cardinality
 * @property {string} [inverse]
 * @property {boolean} [required]
 */

/**
 * @typedef {Object} SchemaResource
 * @property {string} [idAttribute]
 * @property {Object<string, JSONSchema>} attributes
 * @property {Object<string, SchemaRelationship>} relationships
 */

/**
 * @typedef {Object} Schema
 * @property {string} [$schema]
 * @property {string} [$id]
 * @property {string} [title]
 * @property {string} [description]
 * @property {*} [meta]
 * @property {string} [version]
 * @property {Object<string, SchemaResource>} resources
 */

const metaschemaWithErrors = (() => {
	const out = merge(structuredClone(metaschema), {
		definitions: {
			attribute: {
				$ref: "http://json-schema.org/draft-07/schema#",
			},
			relationship: {
				properties: {
					cardinality: {
						errorMessage: 'must be "one" or "many"',
					},
				},
			},
		},
	});
	delete out.$id;
	return out;
})();

const getValidateSchemaCache = createDeepCache();

/**
 * Validates that a schema is valid
 * @param {Schema} schema - The schema to validate
 * @param {Object} options
 * @param {import('ajv').Ajv} options.validator
 * @throws {Error} If the schema is invalid
 */
export function validateSchema(schema, options = {}) {
	const { validator = defaultValidator } = options;

	if (typeof schema !== "object") {
		return [
			{ message: "Invalid schema: expected object, got " + typeof schema },
		];
	}
	const validatorCache = getValidateSchemaCache(schema, validator);
	if (validatorCache.hit) return validatorCache.value;

	const baseValidate = validator.compile(metaschemaWithErrors);
	if (!baseValidate(schema)) {
		const result = translateAjvErrors(baseValidate.errors, schema, "schema");
		validatorCache.set(result);
		return result;
	}

	const attributeSchemaErrors = [];
	Object.entries(schema.resources).forEach(([resName, resSchema]) =>
		Object.entries(resSchema.attributes).forEach(([attrName, attrSchema]) => {
			try {
				validator.compile(attrSchema);
			} catch (err) {
				attributeSchemaErrors.push({
					message: `Invalid attribute schema "${resName}.${attrName}": ${err.message}`,
				});
			}
		}),
	);

	if (attributeSchemaErrors.length > 0) {
		validatorCache.set(attributeSchemaErrors);
		return attributeSchemaErrors;
	}

	const introspectiveSchema = merge(structuredClone(metaschema), {
		properties: {
			resources: {
				properties: mapValues(schema.resources, (_, resName) => ({
					$ref: `#/definitions/resources/${resName}`,
				})),
			},
		},
		definitions: {
			resources: mapValues(schema.resources, (resSchema, resName) => ({
				allOf: [
					{ $ref: "#/definitions/resource" },
					{
						type: "object",
						properties: {
							type: { const: resName },
							attributes: {
								type: "object",
								required: [
									resSchema.idAttribute ?? "id",
									...(resSchema.requiredAttributes ?? []),
								],
							},
							relationships: {
								type: "object",
								required: resSchema.requiredRelationships ?? [],
							},
						},
					},
				],
			})),
			relationship: {
				properties: {
					type: {
						enum: Object.keys(schema.resources),
						errorMessage: `Invalid resource type "\${0}": use one of (${Object.keys(schema.resources).join(", ")})`,
					},
				},
			},
		},
	});
	delete introspectiveSchema.$id;
	delete introspectiveSchema.properties.resources.patternProperties;

	const introspectiveValidate = validator.compile(introspectiveSchema);
	const introspectiveResult = introspectiveValidate(schema)
		? []
		: translateAjvErrors(introspectiveValidate.errors, schema, "schema");

	validatorCache.set(introspectiveResult);
	return introspectiveResult;
}
