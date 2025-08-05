import { defaultExpressionEngine } from "@data-prism/expressions";
import { get, last, mapValues, omit, sortBy } from "lodash-es";
import { defaultValidator } from "./resource.js";

/**
 * @typedef {Object} Expression
 * @property {*} [key] - Dynamic expression properties
 */

/**
 * @typedef {Object} Query
 * @property {string} [id]
 * @property {number} [limit]
 * @property {number} [offset]
 * @property {Object|Object[]} [order] - Single order object or array of order objects
 * @property {Array|Object|string} select - Select clause: array, object, or "*"
 * @property {string} [type]
 * @property {Object} [where] - Where conditions
 */

/**
 * @typedef {Query} RootQuery
 * @property {string} type - Required type for root queries
 */

/**
 * @typedef {Query} NormalQuery
 * @property {Object} select - Normalized select object
 * @property {Object[]} [order] - Array of order objects
 * @property {string} type - Required type
 */

/**
 * @typedef {RootQuery & NormalQuery} NormalRootQuery
 */

/**
 * Validates that a query is valid against the schema
 * @param {Object} schema - The schema object
 * @param {RootQuery} query - The query to validate
 * @throws {Error} If the query is invalid
 */
export function ensureValidQuery(schema, query, options = {}) {
	const { expressionEngine = defaultExpressionEngine } = options;

	const querySchema = {
		type: "object",
		required: ["type"],
		$ref: `#/definitions/resources/${query.type}`,
		definitions: {
			expression: {
				type: "object",
				minProperties: 1,
				maxProperties: 1,
				additionalProperties: false,
				properties: expressionEngine.expressionNames.reduce(
					(acc, n) => ({ ...acc, [n]: {} }),
					{},
				),
			},
			resources: mapValues(schema.resources, (resSchema, resName) => ({
				type: "object",
				required: ["select"],
				properties: {
					type: { type: "string", const: resName },
					id: { type: "string" },
					select: {
						oneOf: [
							{ type: "string", const: "*" },
							{
								$ref: `#/definitions/resources/${resName}/definitions/selectObject`,
							},
							{
								$ref: `#/definitions/resources/${resName}/definitions/selectArray`,
							},
						],
					},
					limit: { type: "integer", minimum: 1 },
					offset: { type: "integer", minimum: 0 },
					where: {
						anyOf: [
							{ $ref: "#/definitions/expression" },
							{
								type: "object",
								properties: mapValues(resSchema.attributes, () => ({})),
								additionalProperties: {
									not: true,
									errorMessage:
										"is neither be an expression nor an object that uses valid attributes as keys",
								},
							},
						],
					},
					order: {
						oneOf: [
							{
								$ref: `#/definitions/resources/${resName}/definitions/orderItem`,
							},
							{
								type: "array",
								items: {
									$ref: `#/definitions/resources/${resName}/definitions/orderItem`,
								},
							},
						],
						errorMessage:
							'must be a value or array of values of the form { "attribute": "asc/desc" }',
					},
				},
				definitions: {
					selectArray: {
						type: "array",
						minItems: 1,
						items: {
							anyOf: [
								{
									type: "string",
									enum: ["*", ...Object.keys(resSchema.attributes)],
								},
								{
									$ref: `#/definitions/resources/${resName}/definitions/selectObject`,
								},
							],
							errorMessage:
								'invalid item in a selection array: ${0} -- selection arrays must contain one of "*", the name of an attribute, or a selection object',
						},
					},
					selectObject: {
						type: "object",
						properties: {
							"*": {},
							...mapValues(resSchema.relationships, (relSchema) => ({
								$ref: `#/definitions/resources/${relSchema.type}`,
							})),
						},
						additionalProperties: {
							oneOf: [
								{ type: "string", enum: Object.keys(resSchema.attributes) },
								{ $ref: "#/definitions/expression" },
							],
						},
						errorMessage: `invalid selection clause: \${0} -- selections must be one of { "*": true }, { "someKey": an expression }, { "someKey": (one of "${Object.keys(resSchema.attributes).join('", "')}") }, or ({ ["${Object.keys(resSchema.relationships).join('" | "')}"]: subquery })`,
					},
					orderItem: {
						type: "object",
						minProperties: 1,
						maxProperties: 1,
						properties: mapValues(resSchema.attributes, () => ({})),
						additionalProperties: {
							anyOf: [{ $ref: "#/definitions/expression" }],
						},
						errorMessage: {
							maxProperties:
								'must have exactly one key with the name of an attribute and a value of "asc" or "desc"',
							minProperties:
								'must have exactly one key with the name of an attribute and a value of "asc" or "desc"',
						},
					},
				},
			})),
		},
	};

	// write better errors on complex select clause problems
	const invalidSelectError = (error) => {
		const cleanPath = error.instancePath.split("/").slice(1);
		const problemSelect = get(query, cleanPath);
		const resType = cleanPath
			.filter((p) => p !== "select")
			.reduce(
				(acc, rel) => schema.resources[acc].relationships[rel].type,
				query.type,
			);
		const resSchema = schema.resources[resType];

		if (typeof problemSelect === "string" && problemSelect !== "*") {
			throw new Error(
				`[data-prism] query${error.instancePath} ${problemSelect} is a string and therefore must be "*" -- perhaps you meant ["${problemSelect}"]`,
			);
		}

		Object.entries(problemSelect).forEach(([key, val]) => {
			if (resSchema.relationships[key]) {
				throw new Error(
					`[data-prism] query${error.instancePath}/${key} must have a valid subquery as its value`,
				);
			}

			if (
				typeof val === "object" &&
				!Array.isArray(val) &&
				!expressionEngine.isExpression(val)
			) {
				throw new Error(
					`[data-prism] query${error.instancePath}/${key} is an object and therefore must be a valid data prism expression (if you meant to have a relationship with a subquery, check your spelling)`,
				);
			}
		});

		// there's an unusual case if none of the above hit -- let the default error handle it
	};

	const validate = defaultValidator.compile(querySchema);
	if (!validate(query)) {
		const customErrorsByDepth = sortBy(
			validate.errors
				.filter((err) => err.keyword === "errorMessage")
				.toReversed(),
			[(err) => err.instancePath.split("/").length],
		);

		const interestingErrors = validate.errors.filter(
			(e) => !["allOf", "anyOf", "oneOf"].includes(e.keyword),
		);
		const usedErrors =
			customErrorsByDepth.length > 0
				? [last(customErrorsByDepth)]
				: interestingErrors.length > 0
					? interestingErrors
					: validate.errors;

		console.log(usedErrors);
		try {
			if (usedErrors[0].instancePath.endsWith("/select"))
				invalidSelectError(usedErrors[0]);

			throw new Error(
				`[data-prism] ${defaultValidator.errorsText(usedErrors, { dataVar: "query" })}`,
			);
		} catch (err) {
			console.log(err);
			throw err;
		}
	}
}

/**
 * Normalizes a query by expanding shorthand syntax and ensuring consistent structure
 * @param {Object} schema - The schema object
 * @param {RootQuery} rootQuery - The query to normalize
 * @returns {NormalRootQuery} The normalized query
 */
export function normalizeQuery(schema, rootQuery) {
	ensureValidQuery(schema, rootQuery);

	const stringToProp = (str) => ({
		[str]: str,
	});

	const go = (query, type) => {
		const { select } = query;

		const selectWithExpandedStar =
			select === "*" ? Object.keys(schema.resources[type].attributes) : select;

		const selectObj = Array.isArray(selectWithExpandedStar)
			? selectWithExpandedStar.reduce((selectObj, item) => {
					const subObj = typeof item === "string" ? stringToProp(item) : item;
					return { ...selectObj, ...subObj };
				}, {})
			: select;

		const selectWithStar = selectObj["*"]
			? {
					...Object.keys(schema.resources[type].attributes).reduce(
						(acc, attr) => ({ ...acc, ...stringToProp(attr) }),
						{},
					),
					...omit(selectObj, ["*"]),
				}
			: selectObj;

		const selectWithSubqueries = mapValues(selectWithStar, (sel, key) => {
			if (
				key in schema.resources[type].relationships &&
				typeof sel === "object"
			) {
				const relType = schema.resources[type].relationships[key].type;
				return go(sel, relType);
			}
			return sel;
		});

		const orderObj = query.order
			? { order: !Array.isArray(query.order) ? [query.order] : query.order }
			: {};

		return {
			...query,
			select: selectWithSubqueries,
			type,
			...orderObj,
		};
	};

	return go(rootQuery, rootQuery.type);
}
