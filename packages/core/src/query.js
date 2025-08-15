import { defaultExpressionEngine } from "@data-prism/expressions";
import { mapValues, omit } from "lodash-es";
import { defaultValidator } from "./resource.js";
import { createDeepCache, ensure, translateAjvErrors } from "./lib/helpers.js";
import baseQuerySchema from "./fixtures/query.schema.json";

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
const getResourceSchemaCache = createDeepCache();
const getResourceSchemaStrictCache = createDeepCache();
let validateQueryShape;

const isExpressionLike = (obj) =>
	typeof obj === "object" &&
	!Array.isArray(obj) &&
	Object.keys(obj).length === 1 &&
	!obj.select;

function getResourceStructureValidator(
	schema,
	resourceType,
	strict,
	validator,
	expressionEngine,
) {
	let resourceSchemaCache = strict
		? getResourceSchemaCache(schema, validator, expressionEngine)
		: getResourceSchemaStrictCache(schema, validator, expressionEngine);

	let resourceSchemasByType;
	if (!resourceSchemaCache.value) {
		resourceSchemasByType = new Map();
		resourceSchemaCache.set(resourceSchemasByType);
	} else {
		resourceSchemasByType = resourceSchemaCache.value;
		const resourceSchema = resourceSchemasByType.get(resourceType);
		if (resourceSchema) return resourceSchema;
	}

	const ajvSchema = {
		type: "object",
		required: ["select"],
		properties: {
			type: { type: "string", const: resourceType },
			id: { type: "string" },
			select: {}, // validated programatically
			limit: { type: "integer", minimum: 1 },
			offset: { type: "integer", minimum: 0 },
			where: {
				anyOf: [
					{ $ref: "#/definitions/expression" },
					{
						type: "object",
						properties: mapValues(
							schema.resources[resourceType].attributes,
							() => ({}),
						),
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
						$ref: "#/definitions/orderItem",
					},
					{
						type: "array",
						items: {
							$ref: "#/definitions/orderItem",
						},
					},
				],
				errorMessage:
					'must be a value or array of values of the form { "attribute": "asc/desc" }',
			},
		},
		definitions: {
			expression: {
				type: "object",
				minProperties: 1,
				maxProperties: 1,
				...(strict
					? {
							additionalProperties: false,
							properties: expressionEngine.expressionNames.reduce(
								(acc, n) => ({ ...acc, [n]: {} }),
								{},
							),
						}
					: {}),
			},
			orderItem: {
				type: "object",
				minProperties: 1,
				maxProperties: 1,
				properties: mapValues(
					schema.resources[resourceType].attributes,
					() => ({}),
				),
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
	const compiled = validator.compile(ajvSchema);

	resourceSchemasByType.set(resourceType, compiled);
	return compiled;
}

/**
 * Validates that a query is valid against the schema
 * @param {Object} schema - The schema object
 * @param {RootQuery} query - The query to validate
 * @param {Object} [options]
 * @param {Object} [options.expressionEngine] - a @data-prism/graph expression engine
 * @param {Ajv} [options.validator] - The validator instance to use
 * @param {boolean} [options.strict=false] - The validator and expression engine will be used in validation
 * @return {import('./lib/helpers.js').StandardError[]}
 */
export function validateQuery(schema, rootQuery, options = {}) {
	const {
		expressionEngine = defaultExpressionEngine,
		validator = defaultValidator,
		strict = false,
	} = options;

	if (!validateQueryShape)
		validateQueryShape = defaultValidator.compile(baseQuerySchema);

	if (typeof schema !== "object")
		return [{ message: "[data-prism] schema must be an object" }];
	if (typeof expressionEngine !== "object")
		return [{ message: "[data-prism] expressionEngine must be an object" }];
	if (typeof validator !== "object")
		return [{ message: "[data-prism] validator must be an object" }];
	if (typeof rootQuery !== "object")
		return [{ message: "[data-prism] query must be an object" }];
	if (!rootQuery.type)
		return [{ message: "[data-prism] query must have a type" }];

	// Shape validation
	if (!validateQueryShape(rootQuery) > 0) return validateQueryShape.errors;

	const errors = [];
	const addError = (message, path, value) => {
		errors.push({
			message: `[data-prism] [query/${path.join("/")}] ${message}`,
			value,
		});
	};

	const go = (query, type, path) => {
		const resSchema = schema.resources[type];
		const validateStructure = getResourceStructureValidator(
			schema,
			type,
			strict,
			validator,
			expressionEngine,
		);

		if (!validateStructure(query)) {
			translateAjvErrors(validateStructure.errors, query, "query").forEach(
				(err) => {
					errors.push(err);
				},
			);
			if (typeof query.select !== "object") return;
		}

		const validateSelectObject = (selectObj, prevPath) => {
			Object.entries(selectObj).forEach(([key, val]) => {
				const curPath = [...prevPath, key];

				if (key === "*") return;

				if (key in resSchema.relationships)
					go(val, resSchema.relationships[key].type, curPath);
				else if (Array.isArray(val))
					addError("selections within an object may not be arrays", curPath);
				else if (typeof val === "object") {
					if (
						(strict && !expressionEngine.isExpression(val)) ||
						(!strict && !isExpressionLike(val))
					) {
						addError(
							`selections with objects as their values must either be valid data prism expressions or subqueries with a valid relationship as the key (${key} is not a valid relationship)`,
							curPath,
						);
					}
				} else if (typeof val === "string") {
					if (!Object.keys(resSchema.attributes).includes(val)) {
						addError(
							`selections that are strings must be the name of an attribute -- "${val}" is not`,
							curPath,
							val,
						);
					}
				}
				// if none of these trigger, the selection is valid
			});
		};

		const validateSelectArray = (selectArray) => {
			selectArray.forEach((val, idx) => {
				const curPath = [...path, "select", idx];

				if (val === "*") return;

				if (Array.isArray(val)) {
					addError(
						"selections within an array may not be arrays",
						curPath,
						val,
					);
				} else if (typeof val === "object") validateSelectObject(val, curPath);
				else if (typeof val === "string") {
					if (!Object.keys(resSchema.attributes).includes(val)) {
						addError(
							`selections within an array that are strings must be "*" or the name of an attribute -- "${val}" is not`,
							curPath,
							val,
						);
					}
				}
				// if none of these trigger, the selection is valid
			});
		};

		if (query.select === "*") return;
		if (Array.isArray(query.select)) return validateSelectArray(query.select);
		if (typeof query.select === "object")
			return validateSelectObject(query.select, [...path, "select"]);

		addError(
			`selections must be one of { "*": true }, { "someKey": an expression }, { "someKey": (one of "${Object.keys(resSchema.attributes).join('", "')}") }, or ({ "${Object.keys(resSchema.relationships).join('" | "')}": subquery })`,
			[...path, "select"],
			query.select,
		);
	};

	go(rootQuery, rootQuery.type, []);
	return errors;
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
