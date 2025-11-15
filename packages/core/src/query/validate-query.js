import { mapValues } from "es-toolkit";
import baseQuerySchema from "../fixtures/query.schema.json";
import {
	defaultValidator,
	defaultSelectEngine,
	defaultWhereEngine,
} from "../lib/defaults.js";
import { createDeepCache, translateAjvErrors } from "../lib/helpers.js";
import { NORMALIZED } from "./normalize-query.js";

// with/without an expression engine (EE)
const getResourceSchemaCache = createDeepCache();
const getResourceSchemaEECache = createDeepCache();

let validateQueryShape;

const createErrorReporter =
	(pathPrefix = "query") =>
	(message, path, value) => ({
		message: `[${pathPrefix}/${path.join("/")}] ${message}`,
		value,
	});

function getResourceStructureValidator(schema, resourceType, engines) {
	const resSchema = schema.resources[resourceType];
	const { selectEngine, whereEngine } = engines;

	let resourceSchemaCache = whereEngine
		? getResourceSchemaEECache(schema, whereEngine)
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

	const extraSelectExpressionRules = whereEngine
		? {
				additionalProperties: false,
				properties: selectEngine.expressionNames.reduce(
					(acc, n) => ({ ...acc, [n]: {} }),
					{},
				),
			}
		: {};

	const extraWhereExpressionRules = whereEngine
		? {
				additionalProperties: false,
				properties: whereEngine.expressionNames.reduce(
					(acc, n) => ({ ...acc, [n]: {} }),
					{},
				),
			}
		: {};

	const ajvSchema = {
		oneOf: [
			{ type: "string", const: "*" },
			{ type: "array" },
			{ $ref: "#/definitions/fullQuery" },
			{ $ref: "#/definitions/selectClauseSubquery" },
		],
		definitions: {
			whereExpression: {
				type: "object",
				minProperties: 1,
				maxProperties: 1,
				...extraWhereExpressionRules,
			},
			selectExpression: {
				type: "object",
				minProperties: 1,
				maxProperties: 1,
				...extraSelectExpressionRules,
			},
			selectClauseSubquery: {
				type: "object",
				allOf: [
					{ not: { required: ["select"] } },
					{ not: { required: ["group"] } },
				],
			},
			fullQuery: {
				oneOf: [
					{ $ref: "#/definitions/fullGroupQuery" },
					{ $ref: "#/definitions/fullSelectQuery" },
				],
			},
			fullGroupQuery: {
				type: "object",
				required: ["group"],
				properties: {
					type: { type: "string", const: resourceType },
					ids: { type: "array", items: { type: ["string", "integer"] } },
					limit: { type: "integer", minimum: 1 },
					offset: { type: "integer", minimum: 0 },
					where: { $ref: "#/definitions/whereClause" },
					order: { $ref: "#/definitions/orderClause" },
					group: {
						type: "object",
						properties: {
							by: {
								oneOf: [
									{ type: "string", enum: Object.keys(resSchema.attributes) },
									{
										type: "array",
										items: {
											type: "string",
											enum: Object.keys(resSchema.attributes),
										},
									},
								],
							},
							select: {},
							aggregates: {
								type: "object",
								additionalProperties: {
									type: "object",
									$ref: "#/definitions/selectExpression",
								},
							},
							where: {
								anyOf: [
									{ $ref: "#/definitions/whereExpression" },
									{
										type: "object",
										properties: mapValues(
											schema.resources[resourceType].attributes,
											() => ({}),
										),
										additionalProperties: {
											not: true,
											errorMessage:
												"is neither an expression nor an object that uses valid attributes as keys",
										},
									},
								],
							},
							order: {},
						},
					},
				},
			},
			fullSelectQuery: {
				type: "object",
				required: ["select"],
				allOf: [
					{ not: { required: ["id", "ids"] } },
					{ not: { required: ["group"] } },
				],
				properties: {
					type: { type: "string", const: resourceType },
					id: { type: ["string", "integer"] },
					ids: { type: "array", items: { type: ["string", "integer"] } },
					select: {},
					limit: { type: "integer", minimum: 1 },
					offset: { type: "integer", minimum: 0 },
					where: { $ref: "#/definitions/whereClause" },
					order: { $ref: "#/definitions/orderClause" },
				},
			},
			orderItem: {
				type: "object",
				minProperties: 1,
				maxProperties: 1,
				additionalProperties: false,
				errorMessage: {
					maxProperties:
						'must have exactly one key with the name of an attribute and a value of "asc" or "desc"',
					minProperties:
						'must have exactly one key with the name of an attribute and a value of "asc" or "desc"',
				},
			},
			orderClauseObject: {
				type: "object",
				minProperties: 1,
				maxProperties: 1,
				additionalProperties: false,
				properties: mapValues(
					schema.resources[resourceType].attributes,
					() => ({ type: "string", enum: ["asc", "desc"] }),
				),
				errorMessage: {
					maxProperties:
						'must have exactly one key with the name of an attribute and a value of "asc" or "desc"',
					minProperties:
						'must have exactly one key with the name of an attribute and a value of "asc" or "desc"',
				},
			},
			orderClauseArray: {
				type: "array",
				items: { $ref: "#/definitions/orderClauseObject" },
			},
			orderClause: {
				oneOf: [
					{ $ref: "#/definitions/orderClauseObject" },
					{ $ref: "#/definitions/orderClauseArray" },
				],
			},
			whereClause: {
				anyOf: [
					{ $ref: "#/definitions/whereExpression" },
					{
						type: "object",
						properties: mapValues(
							schema.resources[resourceType].attributes,
							() => ({}),
						),
						additionalProperties: {
							not: true,
							errorMessage:
								"is neither an expression nor an object that uses valid attributes as keys",
						},
					},
				],
			},
		},
	};

	const compiled = defaultValidator.compile(ajvSchema);
	resourceSchemasByType.set(resourceType, compiled);
	return compiled;
}

function validateStructure(schema, query, type, engines) {
	const { selectEngine, whereEngine } = engines;
	const errors = [];
	const validator = getResourceStructureValidator(schema, type, engines);

	const structureIsValid = validator(query);
	if (!structureIsValid) {
		translateAjvErrors(validator.errors, query, "query").forEach((err) =>
			errors.push(err),
		);
	}

	const whereExpressionErrors = whereEngine.validateExpression(
		query.where ?? {},
	);
	errors.push(...whereExpressionErrors);

	Object.values(query.group?.aggregates ?? {}).forEach((expr) => {
		const errs = selectEngine.validateExpression(expr);
		errors.push(...errs);
	});

	return errors;
}

/**
 * Validates select clause (works for both regular and group select)
 *
 * @param {*} selectClause - The select clause to validate
 * @param {Object} options
 * @param {Set<string>} options.validFields - Set of valid field names
 * @param {Function} options.isExpression - Function to check if value is expression
 * @param {Function} options.onSubquery - Handler for subquery validation
 * @param {Array<string>} options.path - Current path for error reporting
 * @param {Function} options.addError - Error reporter function
 */
function validateSelectClause(selectClause, options) {
	const { validFields, isExpression, onSubquery, path, addError } = options;

	if (selectClause === "*") return;

	if (Array.isArray(selectClause)) {
		selectClause.forEach((val, idx) => {
			const currentPath = [...path, idx];

			if (val === "*") return;

			if (Array.isArray(val)) {
				addError("Invalid selection: nested arrays not allowed.", currentPath);
				return;
			}

			if (typeof val === "object") {
				validateSelectClause(val, { ...options, path: currentPath });
				return;
			}

			if (typeof val === "string") {
				if (!validFields.has(val)) {
					addError(
						`Invalid field "${val}" in select array: must be a valid field.`,
						currentPath,
					);
				}
			}
		});
		return;
	}

	if (typeof selectClause === "object") {
		Object.entries(selectClause).forEach(([key, val]) => {
			const currentPath = [...path, key];

			if (key === "*") return;

			// Check if this is a subquery (relationship traversal)
			if (onSubquery && onSubquery(key, val, currentPath)) {
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
				if (!isExpression(val)) {
					addError(
						`Invalid selection "${key}": object values must be expressions${onSubquery ? " or subqueries" : ""}.`,
						currentPath,
					);
				}
				return;
			}

			if (typeof val === "string") {
				if (!validFields.has(val)) {
					addError(`Invalid field "${val}": not a valid field.`, currentPath);
				}
			}
		});
		return;
	}

	addError('Invalid select value: must be "*", an object, or an array.', path);
}

/**
 * Extracts field names from a select clause (handles arrays, objects, wildcards)
 */
function extractFieldNames(selectClause, fallbackFields) {
	if (selectClause === "*") return fallbackFields;

	if (Array.isArray(selectClause)) {
		return selectClause.flatMap((v) => extractFieldNames(v, fallbackFields));
	}

	if (typeof selectClause === "object") {
		return Object.keys(selectClause).flatMap((v) =>
			extractFieldNames(v, fallbackFields),
		);
	}

	return [selectClause];
}

/**
 * Validates a group query (can be called recursively for nested groups)
 */
function validateGroupQuery(groupQuery, context) {
	const { parentGroup, path, addError, whereEngine, selectEngine } = context;
	const { aggregates, by, group, order, select, where } = groupQuery;

	const byArray = Array.isArray(by) ? by : [by];
	const orderArray = order ? (Array.isArray(order) ? order : [order]) : null;

	// Validate nested group's "by" references parent output
	if (parentGroup) {
		const parentByArray = Array.isArray(parentGroup.by)
			? parentGroup.by
			: [parentGroup.by];

		const parentOutputFields = new Set(
			parentGroup.select
				? [
						...extractFieldNames(parentGroup.select, parentByArray),
						...Object.keys(parentGroup.aggregates ?? {}),
					]
				: [...parentByArray, ...Object.keys(parentGroup.aggregates ?? {})],
		);

		byArray.forEach((field) => {
			if (!parentOutputFields.has(field)) {
				addError(
					`Invalid by clause value "${field}". It must be a value in the parent's "select" clause or the key of an aggregate field. Valid: "${[...parentOutputFields].join('", "')}"`,
					[...path, "by"],
				);
			}
		});
	}

	// Validate group.select
	if (select) {
		validateSelectClause(select, {
			validFields: new Set(byArray),
			isExpression: selectEngine.isExpression,
			path: [...path, "select"],
			addError,
		});
	}

	// Validate group.where
	if (where && !whereEngine.isExpression(where)) {
		Object.entries(where).forEach(([key, val]) => {
			if (!byArray.includes(key) && !whereEngine.isExpression(val)) {
				addError(
					`Invalid where value: ${key} must either be in the "by" clause or be an expression`,
					[...path, "where", key],
				);
			}
		});
	}

	// Validate group.order
	if (orderArray) {
		const validOrderFields = new Set([
			...byArray,
			...Object.keys(select ?? {}),
			...Object.keys(aggregates ?? {}),
		]);

		orderArray.forEach((orderItem) => {
			Object.keys(orderItem).forEach((key) => {
				if (!validOrderFields.has(key)) {
					addError(
						`Invalid order value: ${key} must either be in the "by", "select", or "aggregates" clause`,
						[...path, "order"],
					);
				}
			});
		});
	}

	// Validate nested group (recursion)
	if (group) {
		validateGroupQuery(group, {
			...context,
			parentGroup: groupQuery,
			path: [...path, "group"],
		});
	}
}

/**
 * Validates a regular select query with relationships
 */
function validateSelectQuery(query, context) {
	const { schema, resourceType, path, addError, selectEngine } = context;
	const resSchema = schema.resources[resourceType];
	const select = query.select ?? query;

	validateSelectClause(select, {
		validFields: new Set(Object.keys(resSchema.attributes)),
		isExpression: selectEngine.isExpression,
		onSubquery: (key, val, currentPath) => {
			if (key in resSchema.relationships) {
				if (typeof val !== "object" && val !== "*") {
					addError(
						`Invalid value for relationship "${key}": expected object or "*", got ${typeof val} "${val}".`,
						currentPath,
					);
					return true;
				}
				// Recursively validate subquery
				validateQuerySemantics(
					val,
					resSchema.relationships[key].type,
					[...path, key],
					context,
				);
				return true;
			}
			return false;
		},
		path: [...path, "select"],
		addError,
	});
}

/**
 * Validates semantic aspects of a query (after structural validation)
 */
function validateQuerySemantics(query, type, path, context) {
	const { schema, addError, whereEngine } = context;
	const resSchema = schema.resources[type];

	// Handle wildcard queries (just return "*")
	if (query === "*") return;

	// Validate where clause
	if (query.where) {
		if (
			!whereEngine.isExpression(query.where) &&
			Object.keys(query.where).some((k) => !(k in resSchema.attributes))
		) {
			addError(
				"Invalid where clause: unknown attribute names. Use valid attributes or an expression.",
				[...path, "where"],
			);
		}
	}

	// Branch based on query type
	if (typeof query === "object" && query !== null && "group" in query) {
		validateGroupQuery(query.group, {
			...context,
			parentGroup: null,
			resourceType: type,
			path: [...path, "group"],
		});
	} else if (typeof query === "object" && query !== null) {
		validateSelectQuery(query, { ...context, resourceType: type, path });
	}
}

/**
 * Main validation entry point
 */
export function validateQuery(schema, rootQuery, options = {}) {
	const {
		selectEngine = defaultSelectEngine,
		whereEngine = defaultWhereEngine,
	} = options;

	if (rootQuery[NORMALIZED]) return [];

	// Early validation
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
	if (selectEngine && typeof selectEngine !== "object") {
		return [{ message: "selectEngine must be an object" }];
	}
	if (whereEngine && typeof whereEngine !== "object") {
		return [{ message: "whereEngine must be an object" }];
	}
	if (!rootQuery.type) {
		return [{ message: "Missing query type: required for validation" }];
	}

	// Shape validation (validates basic query structure)
	if (!validateQueryShape) {
		validateQueryShape = defaultValidator.compile(baseQuerySchema);
	}
	const shapeResult = validateQueryShape(rootQuery);
	if (!shapeResult) return validateQueryShape.errors;

	const errors = [];
	const addError = (message, path, value) => {
		errors.push(createErrorReporter()(message, path, value ?? rootQuery));
	};

	// Structural validation
	const structureErrors = validateStructure(schema, rootQuery, rootQuery.type, {
		selectEngine,
		whereEngine,
	});
	errors.push(...structureErrors);

	if (typeof rootQuery !== "object") return errors;

	// Semantic validation
	const context = {
		schema,
		addError,
		whereEngine,
		selectEngine,
	};

	validateQuerySemantics(rootQuery, rootQuery.type, [], context);

	return errors;
}
