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

const getResourceSchemaCache = createDeepCache();

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

function getResourceStructureValidator(schema, resourceType) {
	let resourceSchemaCache = getResourceSchemaCache(schema);

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
					{ $ref: "#/definitions/expressionLike" },
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
			expressionLike: {
				type: "object",
				minProperties: 1,
				maxProperties: 1,
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

/**
 * Validates semantic aspects (relationships, attributes, expressions)
 *
 * @param {Object} schema - The schema object
 * @param {Object} query - The query to validate
 * @param {string} type - Resource type
 * @param {Array} path - Current validation path
 * @param {Object} validationFns - Validation functions
 * @return {{errors: Array, isValid: boolean}}
 */
function validateSemantics(schema, query, type, path, validationFns) {
	const { isValidExpression, skipStringValidation } = validationFns;
	const errors = [];
	const addError = (message, path, value) => {
		errors.push(createErrorReporter()(message, path, value));
	};

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
				// Validate that relationship points to a valid subquery, not an attribute
				if (typeof val === "string") {
					addError(
						`Invalid value for relationship "${key}": expected object, got string "${val}".`,
						currentPath,
						val,
					);
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

			if (typeof val === "string" && !skipStringValidation) {
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

			if (typeof val === "string" && !skipStringValidation) {
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

	if (query.select === "*") return { errors, isValid: true };

	if (Array.isArray(query.select)) validateSelectArray(query.select);
	else if (typeof query.select === "object")
		validateSelectObject(query.select, [...path, "select"]);
	else if (!skipStringValidation) {
		addError(
			"Invalid select value: must be \"*\", an object, or an array.",
			[...path, "select"],
			query.select,
		);
	}

	return { errors, isValid: errors.length === 0 };
}

/**
 * Private function that orchestrates validation phases
 *
 * @param {Object} schema - The schema object
 * @param {RootQuery} rootQuery - The query to validate
 * @param {Object} validationFns - Validation functions
 * @return {import('./lib/helpers.js').StandardError[]}
 */
function validateQueryStructure(schema, rootQuery, validationFns) {
	const errors = [];
	// Cache structure validators to avoid repeated calls
	const structureValidators = new Map();

	const go = (query, type, path) => {
		// Structural validation first
		if (!structureValidators.has(type)) {
			structureValidators.set(
				type,
				getResourceStructureValidator(schema, type),
			);
		}
		const validator = structureValidators.get(type);

		const structuralIsValid = validator(query);
		if (!structuralIsValid) {
			translateAjvErrors(validator.errors, query, "query").forEach((err) =>
				errors.push(err),
			);
			if (typeof query.select !== "object") return;
		}

		// Semantic validation second
		const semanticResult = validateSemantics(
			schema,
			query,
			type,
			path,
			validationFns,
		);
		errors.push(...semanticResult.errors);

		// Recurse into relationships
		if (typeof query.select === "object" && !Array.isArray(query.select)) {
			const resSchema = schema.resources[type];
			Object.entries(query.select).forEach(([key, val]) => {
				if (key in resSchema.relationships && typeof val === "object")
					go(val, resSchema.relationships[key].type, [...path, key]);
			});
		}
	};

	go(rootQuery, rootQuery.type, []);
	return errors;
}

/**
 * Validates that a query is valid against the schema
 *
 * @param {Object} schema - The schema object
 * @param {RootQuery} query - The query to validate
 * @return {import('./lib/helpers.js').StandardError[]}
 */
export function validateQuery(schema, rootQuery) {
	if (!validateQueryShape)
		validateQueryShape = defaultValidator.compile(baseQuerySchema);

	if (typeof schema !== "object")
		return [{ message: "Invalid schema: expected object, got " + typeof schema }];
	if (typeof rootQuery !== "object")
		return [{ message: "Invalid query: expected object, got " + typeof rootQuery }];
	if (!rootQuery.type) return [{ message: "Missing query type: required for validation" }];

	// Shape validation
	if (!validateQueryShape(rootQuery) > 0) return validateQueryShape.errors;

	return validateQueryStructure(schema, rootQuery, {
		isValidExpression: isExpressionLike,
	});
}

/**
 * Validates that a query is valid against the schema using validator and expressionEngine for complete validation
 *
 * @param {Object} schema - The schema object
 * @param {RootQuery} query - The query to validate
 * @param {Object} [options]
 * @param {Object} [options.expressionEngine] - a @data-prism/graph expression engine
 * @return {import('./lib/helpers.js').StandardError[]}
 */
export function validateQueryComplete(schema, rootQuery, options = {}) {
	const { expressionEngine = defaultExpressionEngine } = options;

	if (typeof expressionEngine !== "object")
		return [{ message: "Invalid \"expressionEngine\": expected object, got " + typeof expressionEngine }];

	// Standard validation
	const validateQueryResult = validateQuery(schema, rootQuery);
	if (validateQueryResult.length > 0) return validateQueryResult;

	// Additional complete validation with expression engine
	return validateQueryStructure(schema, rootQuery, {
		isValidExpression: expressionEngine.isExpression,
		skipStringValidation: true,
	});
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
