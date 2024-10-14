import Ajv, { ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import * as geojsonValidate from "geojson-validation";
import { Schema } from "./schema.js";
import { mapValues, omit } from "lodash-es";
import { Ref } from "./graph.js";
import geojsonSchema from "../schemas/geojson.schema.json";

type CreateResource = {
	type: string;
	id?: number | string;
	attributes?: { [k: string]: unknown };
	relationships?: {
		[k: string]: Ref | Ref[] | null;
	};
};

type UpdateResource = {
	type: string;
	id: number | string;
	attributes?: { [k: string]: unknown };
	relationships?: {
		[k: string]: Ref | Ref[] | null;
	};
};

type DeleteResource = Ref;

type NormalResourceTree = {
	type: string;
	id?: number | string;
	attributes?: { [k: string]: unknown };
	relationships?: {
		[k: string]: NormalResourceTree | NormalResourceTree[] | Ref | Ref[] | null;
	};
};

const ajv = new Ajv();
addFormats(ajv);
ajv.addSchema(geojsonSchema);

export function validateCreateResource(
	schema: Schema,
	resource: CreateResource,
): ErrorObject[] {
	const validateBasis = ajv.compile({
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
				properties: mapValues(resSchema.attributes, (a) =>
					omit(a, ["required"]),
				),
			},
			relationships: {
				type: "object",
				required: Object.keys(resSchema.relationships).filter(
					(k) => resSchema.relationships[k].required,
				),
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

	const validate = ajv.compile(validationSchema);
	if (!validate(resource)) return validate.errors;

	return [];
}

export function validateUpdateResource(
	schema: Schema,
	resource: UpdateResource,
): ErrorObject[] {
	const validateBasis = ajv.compile({
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
				properties: mapValues(resSchema.attributes, (a) =>
					omit(a, ["required"]),
				),
			},
			relationships: {
				type: "object",
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

	const validate = ajv.compile(validationSchema);
	if (!validate(resource)) return validate.errors;

	return [];
}

export function validateDeleteResource(
	schema: Schema,
	resource: DeleteResource,
): ErrorObject[] {
	const validateBasis = ajv.compile({
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

export function validateResourceTree(
	schema: Schema,
	resource: NormalResourceTree,
): ErrorObject[] {
	const basisSchema = {
		type: "object",
		required: ["type"],
		properties: {
			type: { enum: Object.keys(schema.resources) },
		},
	};
	const validateBasis = ajv.compile(basisSchema);
	if (!validateBasis(resource)) return validateBasis.errors;

	const toOneRefOfType = (type, required) => ({
		oneOf: [
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
				attributes: {
					type: "object",
					required: Object.keys(resSchema.attributes).filter(
						(k) => resSchema.attributes[k].required,
					),
					properties: mapValues(resSchema.attributes, (a) =>
						omit(a, ["required"]),
					),
				},
				relationships: {
					type: "object",
					required: Object.keys(resSchema.relationships).filter(
						(k) => resSchema.relationships[k].required,
					),
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
				attributes: {
					type: "object",
					properties: mapValues(resSchema.attributes, (a) =>
						omit(a, ["required"]),
					),
				},
				relationships: {
					type: "object",
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
		$ref: (resource as NormalResourceTree).id
			? `#/definitions/update/${resource.type}`
			: `#/definitions/create/${resource.type}`,
		definitions,
	};

	const validate = ajv.compile(validationSchema);
	if (!validate(resource)) return validate.errors;

	return [];
}
