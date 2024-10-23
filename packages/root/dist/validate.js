import Ajv from "ajv";
import addFormats from "ajv-formats";
import { mapValues, omit } from "lodash-es";
export const defaultValidator = new Ajv();
addFormats(defaultValidator);
export const createValidator = () => {
    const ajv = new Ajv();
    addFormats(ajv);
    return ajv;
};
export function validateCreateResource(schema, resource, validator = defaultValidator) {
    const validateBasis = validator.compile({
        type: "object",
        required: ["type"],
        properties: {
            type: { enum: Object.keys(schema.resources) },
        },
    });
    if (!validateBasis(resource))
        return validateBasis.errors;
    const resSchema = schema.resources[resource.type];
    const validationSchema = {
        type: "object",
        required: [
            "type",
            ...(Object.keys(resSchema.attributes).some((k) => resSchema.attributes[k].required)
                ? ["attributes"]
                : []),
            ...(Object.keys(resSchema.relationships).some((k) => resSchema.relationships[k].required)
                ? ["relationships"]
                : []),
        ],
        properties: {
            type: { const: resource.type },
            id: { type: "string" },
            attributes: {
                type: "object",
                required: Object.keys(resSchema.attributes).filter((k) => resSchema.attributes[k].required),
                additionalProperties: false,
                properties: mapValues(resSchema.attributes, (a) => omit(a, ["required"])),
            },
            relationships: {
                type: "object",
                required: Object.keys(resSchema.relationships).filter((k) => resSchema.relationships[k].required),
                additionalProperties: false,
                properties: mapValues(resSchema.relationships, (relSchema) => relSchema.cardinality === "one"
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
                    }),
            },
        },
    };
    const validate = validator.compile(validationSchema);
    if (!validate(resource))
        return validate.errors;
    return [];
}
export function validateUpdateResource(schema, resource, validator = defaultValidator) {
    const validateBasis = validator.compile({
        type: "object",
        required: ["type", "id"],
        properties: {
            type: { enum: Object.keys(schema.resources) },
            id: { type: "string" },
        },
    });
    if (!validateBasis(resource))
        return validateBasis.errors;
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
                properties: mapValues(resSchema.attributes, (a) => omit(a, ["required"])),
            },
            relationships: {
                type: "object",
                additionalProperties: false,
                properties: mapValues(resSchema.relationships, (relSchema) => relSchema.cardinality === "one"
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
                    }),
            },
        },
    };
    const validate = validator.compile(validationSchema);
    if (!validate(resource))
        return validate.errors;
    return [];
}
export function validateDeleteResource(schema, resource, validator = defaultValidator) {
    const validateBasis = validator.compile({
        type: "object",
        required: ["type", "id"],
        properties: {
            type: { enum: Object.keys(schema.resources) },
            id: { type: "string" },
        },
    });
    if (!validateBasis(resource))
        return validateBasis.errors;
    return [];
}
export function validateResourceTree(schema, resource, validator = defaultValidator) {
    const basisSchema = {
        type: "object",
        required: ["type"],
        properties: {
            type: { enum: Object.keys(schema.resources) },
        },
    };
    const validateBasis = validator.compile(basisSchema);
    if (!validateBasis(resource))
        return validateBasis.errors;
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
        const hasRequiredAttributes = Object.keys(resSchema.attributes).some((k) => resSchema.attributes[k].required);
        const hasRequiredRelationships = Object.keys(resSchema.relationships).some((k) => resSchema.relationships[k].required);
        const required = ["type"];
        if (hasRequiredAttributes)
            required.push("attributes");
        if (hasRequiredRelationships)
            required.push("relationships");
        definitions.create[resName] = {
            type: "object",
            required,
            additionalProperties: false,
            properties: {
                type: { const: resName },
                new: { type: "boolean", const: true },
                attributes: {
                    type: "object",
                    required: Object.keys(resSchema.attributes).filter((k) => resSchema.attributes[k].required),
                    additionalProperties: false,
                    properties: mapValues(resSchema.attributes, (a) => omit(a, ["required"])),
                },
                relationships: {
                    type: "object",
                    required: Object.keys(resSchema.relationships).filter((k) => resSchema.relationships[k].required),
                    additionalProperties: false,
                    properties: mapValues(resSchema.relationships, (relSchema) => relSchema.cardinality === "one"
                        ? relSchema.required
                            ? toOneRefOfType(relSchema.type, true)
                            : toOneRefOfType(relSchema.type, false)
                        : toManyRefOfType(relSchema.type)),
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
                    properties: mapValues(resSchema.attributes, (a) => omit(a, ["required"])),
                },
                relationships: {
                    type: "object",
                    additionalProperties: false,
                    properties: mapValues(resSchema.relationships, (relSchema) => relSchema.cardinality === "one"
                        ? relSchema.required
                            ? toOneRefOfType(relSchema.type, true)
                            : toOneRefOfType(relSchema.type, false)
                        : toManyRefOfType(relSchema.type)),
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
    if (!validate(resource))
        return validate.errors;
    return [];
}
