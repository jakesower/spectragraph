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

const getResourceSchemaCache = createDeepCache();
const getResourceSchemaEECache = createDeepCache();

let validateQueryShape;

const isExpressionLike = (obj) =>
	typeof obj === "object" &&
	!Array.isArray(obj) &&
	Object.keys(obj).length === 1 &&
	!obj.select;

const isValidAttribute = (attributeName, resourceSchema) =>
	attributeName in resourceSchema.attributes;

const createErrorReporter =
	(pathPrefix = "query") =>
	(message, path, value) => ({
		message: `[${pathPrefix}/${path.join("/")}] ${message}`,
		value,
	});

function getResourceStructureValidator(schema, resourceType, expressionEngine) {
	let resourceSchemaCache = expressionEngine
		? getResourceSchemaEECache(schema, expressionEngine)
		: getResourceSchemaCache(schema);

	let resourceSchemasByType;
	if (!resourceSchemaCache.value) {
		resourceSchemasByType = new Map();
		resourceSchemaCache.set(resourceSchemasByType);
	} else {
		resourceSchemasByType = resourceSchemaCache.value;
		const resourceSchema = resourceSchemasByType.get(resourceType);
		if (resourceSchema) return resourceSchema;
	}

	const extraExpressionRules = expressionEngine
		? {
				additionalProperties: false,
				properties: expressionEngine.expressionNames.reduce(
					(acc, n) => ({ ...acc, [n]: {} }),
					{},
				),
			}
		: {};

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
				...extraExpressionRules,
			},
			orderItem: {
				type: "object",
				minProperties: 1,
				maxProperties: 1,
				properties: mapValues(
					schema.resources[resourceType].attributes,
					() => ({}),
				),
				additionalProperties: false,
				errorMessage: {
					maxProperties:
						'must have exactly one key with the name of an attribute and a value of "asc" or "desc"',
					minProperties:
						'must have exactly one key with the name of an attribute and a value of "asc" or "desc"',
				},
			},
		},
	};
	const compiled = defaultValidator.compile(ajvSchema);

	resourceSchemasByType.set(resourceType, compiled);
	return compiled;
}

function validateStructure(schema, query, type, expressionEngine) {
	const errors = [];
	const validator = getResourceStructureValidator(
		schema,
		type,
		expressionEngine,
	);

	// Structure validation first
	const structureIsValid = validator(query);
	if (!structureIsValid) {
		translateAjvErrors(validator.errors, query, "query").forEach((err) =>
			errors.push(err),
		);
	}

	return errors;
}

/**
 * Validates that a query is valid against the schema
 *
 * @param {Object} schema - The schema object
 * @param {RootQuery} query - The query to validate
 * @param {Object} [options]
 * @param {Object} [options.expressionEngine] - a @data-prism/graph expression engine
 * @return {import('./lib/helpers.js').StandardError[]}
 */
export function validateQuery(schema, rootQuery, options = {}) {
	const { expressionEngine } = options;

	if (typeof schema !== "object") {
		return [
			{ message: "Invalid schema: expected object, got " + typeof schema },
		];
	}
	if (typeof rootQuery !== "object") {
		return [
			{ message: "Invalid query: expected object, got " + typeof rootQuery },
		];
	}
	if (expressionEngine && typeof expressionEngine !== "object") {
		return [{ message: "[data-prism] expressionEngine must be an object" }];
	}
	if (!rootQuery.type) {
		return [{ message: "Missing query type: required for validation" }];
	}

	// Shape validation
	if (!validateQueryShape) {
		validateQueryShape = defaultValidator.compile(baseQuerySchema);
	}
	const shapeResult = validateQueryShape(rootQuery);
	if (!shapeResult) return validateQueryShape.errors;

	const errors = [];
	const addError = (message, path, value) => {
		errors.push(createErrorReporter()(message, path, value));
	};

	const go = (query, type, path) => {
		// validate the structure of the resource first
		const structureErrors = validateStructure(
			schema,
			query,
			type,
			expressionEngine,
		);
		if (structureErrors) {
			errors.push(...structureErrors);
			if (typeof query !== "object") return errors;
		}

		// Semantic validation second
		const isValidExpression = expressionEngine
			? expressionEngine.isExpression
			: isExpressionLike;

		const resSchema = schema.resources[type];

		// Validate where clause semantics
		if (query.where) {
			if (
				!isValidExpression(query.where) &&
				Object.keys(query.where).some((k) => !(k in resSchema.attributes))
			) {
				addError(
					"Invalid where clause: unknown attribute names. Use valid attributes or an expression.",
					[...path, "where"],
					query.where,
				);
			}
		}

		// Validate select semantics
		const validateSelectObject = (selectObj, prevPath) => {
			Object.entries(selectObj).forEach(([key, val]) => {
				const currentPath = [...prevPath, key];

				if (key === "*") return;

				if (key in resSchema.relationships) {
					if (typeof val !== "object") {
						addError(
							`Invalid value for relationship "${key}": expected object, got ${typeof val} "${val}".`,
							currentPath,
							val,
						);
					} else {
						go(val, resSchema.relationships[key].type, [...path, key]);
					}

					return;
				}

				if (Array.isArray(val)) {
					addError(
						`Invalid selection "${key}": arrays not allowed in object selects.`,
						currentPath,
					);
					return;
				}

				if (typeof val === "object") {
					if (!isValidExpression(val)) {
						addError(
							`Invalid selection "${key}": not a valid relationship name. Object values must be expressions or subqueries.`,
							currentPath,
						);
					}
					return;
				}

				if (typeof val === "string") {
					if (!isValidAttribute(val, resSchema)) {
						addError(
							`Invalid attribute "${val}": not a valid attribute name.`,
							currentPath,
							val,
						);
					}
				}
			});
		};

		const validateSelectArray = (selectArray) => {
			selectArray.forEach((val, idx) => {
				const currentPath = [...path, "select", idx];

				if (val === "*") return;

				if (Array.isArray(val)) {
					addError(
						"Invalid selection: nested arrays not allowed.",
						currentPath,
						val,
					);
					return;
				}

				if (typeof val === "object") {
					validateSelectObject(val, currentPath);
					return;
				}

				if (typeof val === "string") {
					if (!isValidAttribute(val, resSchema)) {
						addError(
							`Invalid attribute "${val}" in select array: use "*" or a valid attribute name.`,
							currentPath,
							val,
						);
					}
				}
			});
		};

		if (Array.isArray(query.select)) validateSelectArray(query.select);
		else if (typeof query.select === "object") {
			validateSelectObject(query.select, [...path, "select"]);
		} else if (query.select !== "*") {
			addError(
				'Invalid select value: must be "*", an object, or an array.',
				[...path, "select"],
				query.select,
			);
		}

		return errors;
	};

	return go(rootQuery, rootQuery.type, []);
}

/**
 * Normalizes a query by expanding shorthand syntax and ensuring consistent structure
 *
 * @param {Object} schema - The schema object
 * @param {RootQuery} rootQuery - The query to normalize
 * @returns {NormalQuery} The normalized query
 */
export function normalizeQuery(schema, rootQuery) {
	ensure(validateQuery)(schema, rootQuery);

	const go = (query, type) => {
		const { select } = query;
		const resSchema = schema.resources[type];

		const selectWithExpandedStar =
			select === "*" ? Object.keys(resSchema.attributes) : select;

		const selectObj = Array.isArray(selectWithExpandedStar)
			? (() => {
					const result = {};
					for (const item of selectWithExpandedStar) {
						if (typeof item === "string") {
							result[item] = item;
						} else {
							Object.assign(result, item);
						}
					}
					return result;
				})()
			: select;

		const selectWithStar = selectObj["*"]
			? (() => {
					const result = {};
					for (const attr of Object.keys(resSchema.attributes)) {
						result[attr] = attr;
					}
					Object.assign(result, omit(selectObj, ["*"]));
					return result;
				})()
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
