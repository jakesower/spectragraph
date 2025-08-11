import { defaultExpressionEngine } from "@data-prism/expressions";
import { mapValues, omit, partition } from "lodash-es";
import { defaultValidator } from "./resource.js";
import { createDeepCache, ensure, translateAjvErrors } from "./lib/helpers.js";
import baseQuerySchema from "./fixtures/query.schema.json";
import { formatSelectErrors } from "./lib/query-errors.js";

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

// these arguments have references that should seldom, if ever, change
const getValidateQueryCache = createDeepCache();
const baseValidatorCache = new WeakMap();

function validateQueryShape(query, validator) {
	let validateBasis = baseValidatorCache.get(validator);
	if (!validateBasis) {
		validateBasis = validator.compile(baseQuerySchema);
		baseValidatorCache.set(validator, validateBasis);
	}

	return validateBasis(query)
		? []
		: translateAjvErrors(validateBasis.errors, query, "query");
}

function getQuerySchemaDefinitions(schema, expressionEngine, validator) {
	const cache = getValidateQueryCache(schema, expressionEngine, validator);
	let resourceDefinitions = cache.value;

	if (!resourceDefinitions) {
		resourceDefinitions = {
			definitions: {
				expression: buildExpressionDefinition(expressionEngine),
				resources: mapValues(schema.resources, buildResourceSchema),
			},
		};
		cache.set(resourceDefinitions);
	}

	return resourceDefinitions;
}

function buildResourceSchema(resSchema, resName) {
	return {
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
	};
}

function buildExpressionDefinition(expressionEngine) {
	return {
		type: "object",
		minProperties: 1,
		maxProperties: 1,
		additionalProperties: false,
		properties: expressionEngine.expressionNames.reduce(
			(acc, n) => ({ ...acc, [n]: {} }),
			{},
		),
	};
}

/**
 * Validates that a query is valid against the schema
 * @param {Object} schema - The schema object
 * @param {RootQuery} query - The query to validate
 * @param {Object} [options]
 * @param {Object} [options.expressionEngine] - a @data-prism/graph expression engine
 * @param {Ajv} [options.validator] - The validator instance to use
 * @return {import('./lib/helpers.js').StandardError[]}
 */
export function validateQuery(schema, query, options = {}) {
	const {
		expressionEngine = defaultExpressionEngine,
		validator = defaultValidator,
	} = options;

	if (typeof schema !== "object")
		return [{ message: "[data-prism] schema must be an object" }];
	if (typeof expressionEngine !== "object")
		return [{ message: "[data-prism] expressionEngine must be an object" }];
	if (typeof validator !== "object")
		return [{ message: "[data-prism] validator must be an object" }];
	if (typeof query !== "object")
		return [{ message: "[data-prism] query must be an object" }];

	// Shape validation
	const shapeErrors = validateQueryShape(query, validator);
	if (shapeErrors.length > 0) return shapeErrors;

	// Type validation
	if (!Object.keys(schema.resources).includes(query.type)) {
		return [
			{
				message: `[data-prism] query/type ${query.type} is not a valid query type`,
				path: "query/type",
				keyword: "compile",
				value: query.type,
			},
		];
	}

	// Get cached schema definitions
	const resourceDefinitions = getQuerySchemaDefinitions(
		schema,
		expressionEngine,
		validator,
	);

	// Compile query-specific validator
	const querySchema = {
		type: "object",
		required: ["type"],
		$ref: `#/definitions/resources/${query.type}`,
		...resourceDefinitions,
	};

	let validate;
	try {
		validate = validator.compile(querySchema);
	} catch (err) {
		return [
			{ ...err, message: `[data-prism] ${err.message}`, keyword: "compile" },
		];
	}

	if (validate(query)) return [];

	// Process errors
	const [rawSelectErrors, otherErrors] = partition(validate.errors, (e) =>
		e.instancePath.endsWith("/select"),
	);

	return translateAjvErrors(
		[
			...formatSelectErrors(rawSelectErrors, query, schema, expressionEngine),
			...otherErrors,
		],
		query,
		"query",
	);
}

/**
 * Normalizes a query by expanding shorthand syntax and ensuring consistent structure
 * @param {Object} schema - The schema object
 * @param {RootQuery} rootQuery - The query to normalize
 * @returns {NormalQuery} The normalized query
 */
export function normalizeQuery(schema, rootQuery) {
	ensure(validateQuery)(schema, rootQuery);

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
