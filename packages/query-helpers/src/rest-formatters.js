import { createExpressionEngine, $literal, $pipe } from "json-expressions";
import { normalizeQuery } from "@data-prism/core";
import { flattenQuery } from "./traversal.js";
import { mapValues, pick, uniq } from "es-toolkit";

/**
 * @typedef {Object} QueryParameters
 * @property {Object<string, string[]>} fields - Fields to select by resource type
 * @property {string[]} includes - Relationship paths to include
 * @property {Array<{field: string, direction: 'asc'|'desc'}>} sort - Sort parameters
 * @property {Object} pagination - Pagination parameters
 * @property {number} [pagination.limit] - Number of items to return
 * @property {number} [pagination.offset] - Number of items to skip
 * @property {Object<string, any>} filters - Filter conditions by field path
 */

/**
 * @typedef {Object} ParameterFormatter
 * @property {(fields: Object<string, string[]>) => string} formatFields - Format field selections
 * @property {(includes: string[]) => string} formatIncludes - Format relationship includes
 * @property {(sort: Array<{field: string, direction: 'asc'|'desc'}>) => string} formatSort - Format sort parameters
 * @property {(pagination: {limit?: number, offset?: number}) => string} formatPagination - Format pagination
 * @property {(filters: Object<string, any>) => string} formatFilters - Format filter conditions
 * @property {(baseURL: string, resourceType: string, resourceId?: string) => string} formatPath - Format the base path
 * @property {(params: string[]) => string} combineParameters - Combine all parameters into query string
 */

// export function extractWhere(where, engine) {
// 	return engine.apply(where);
// }

export function createWhereExpressionEngine(exprs) {
	return createExpressionEngine({
		custom: { $literal, $pipe, ...exprs },
		includeBase: false,
	});
}

const jsonComparative = (expressionName) => ({
	apply: (operand, inputData) => ({
		...inputData,
		expressionName,
		value: operand,
	}),
});

export const baseWhereExtractors = {
	...Object.fromEntries(
		["$eq", "$ne", "$lt", "$lte", "$gt", "$gte", "$in", "$nin"].map((expr) => [
			expr,
			jsonComparative(expr),
		]),
	),
	$get: {
		apply: (operand, inputData, { apply }) => ({
			...inputData,
			attribute: apply(operand, inputData),
		}),
	},
	$and: {
		apply: (operand, inputData, { apply }) =>
			operand.map((op) => apply(op, inputData)),
	},
};

export function extractWhere(where) {
	const extracted = genericExtractors.apply(where, {});
	return Array.isArray(extracted) ? extracted : [extracted];
}

// export function formatWhere(extractedWhere, formatter) {
// 	return extractWhere.map((w) => applyFormatter(formatter, w)).join("&");
// }

// console.log(genericExtractors);

// // Helper to process template strings
// const processTemplate = (template, field, value) => {
// 	return template.replace(/\${field}/g, field).replace(/\${value}/g, value);
// };

// /**
//  * Creates a simple expression engine using string templates for common operations.
//  * This is the easiest way to create custom WHERE clause extractors for REST APIs.
//  *
//  * @example
//  * // Create a simple REST API engine
//  * const extractors = createSimpleEngine({
//  *   eq: "${field}=${value}",
//  *   gt: "${field}[gt]=${value}",
//  *   lt: "${field}[lt]=${value}"
//  * });
//  *
//  * // Use with createExpressionEngine
//  * const engine = createExpressionEngine(extractors);
//  * const result = engine.apply({ $pipe: [{ $get: "age" }, { $gt: 18 }] });
//  * // Result: "age[gt]=18"
//  *
//  * @param {Object<string, string>} templates - Template strings for each operator (without $ prefix)
//  * @param {Object} [options] - Additional options
//  * @param {string} [options.andJoiner="&"] - String to join AND operations
//  * @param {string} [options.orJoiner="|"] - String to join OR operations
//  * @returns {Object} Expression engine definitions for use with createExpressionEngine
//  */
// export function createSimpleEngine(templates, options = {}) {
// 	const { andJoiner = "&", orJoiner = "|" } = options;

// 	// Build expression definitions from templates
// 	const expressions = {
// 		...pick(defaultExpressions, ["$pipe", "$compose"]),
// 		$get: { apply: (operand) => operand },
// 		$and: {
// 			controlsEvaluation: true,
// 			apply: (operand, inputData, { apply }) =>
// 				operand.map((op) => apply(op, inputData)).join(andJoiner),
// 		},
// 		$or: {
// 			controlsEvaluation: true,
// 			apply: (operand, inputData, { apply }) =>
// 				operand.map((op) => apply(op, inputData)).join(orJoiner),
// 		},
// 	};

// 	// Build comparison expressions from templates
// 	Object.entries(templates).forEach(([op, template]) => {
// 		expressions[`$${op}`] = {
// 			apply: (operand, inputData) =>
// 				processTemplate(template, inputData, operand),
// 		};
// 	});

// 	return expressions;
// }

// // Example: Simple REST API engine using templates
// export const simpleRestExtractors = createSimpleEngine({
// 	eq: "${field}=${value}",
// 	gt: "${field}[gt]=${value}",
// 	lt: "${field}[lt]=${value}",
// 	gte: "${field}[gte]=${value}",
// 	lte: "${field}[lte]=${value}",
// 	ne: "${field}[ne]=${value}",
// });

// // Example: GraphQL-style engine using templates
// export const simpleGraphQLExtractors = createSimpleEngine(
// 	{
// 		eq: "${field}: ${value}",
// 		gt: "${field}_gt: ${value}",
// 		lt: "${field}_lt: ${value}",
// 		gte: "${field}_gte: ${value}",
// 		lte: "${field}_lte: ${value}",
// 		ne: "${field}_ne: ${value}",
// 	},
// 	{ andJoiner: ", ", orJoiner: " OR " },
// );

// /**
//  * Create a simple WHERE expression extractor for REST APIs
//  * @param {Object<string, string>} templates - Template strings for each operator
//  * @param {Object} [options] - Additional options for logical operators
//  * @returns {Function} Function that extracts WHERE expressions to query strings
//  */
// export function createSimpleWhereExtractor(templates, options = {}) {
// 	const extractors = createSimpleEngine(templates, options);
// 	const engine = createExpressionEngine(extractors);
// 	return (where) => extractWhere(where, engine);
// }

// const apiExtractors = {
// 	...pick(defaultExpressions, ["$pipe", "$compose"]),
// 	// core
// 	$get: {
// 		apply: (operand) => operand,
// 	},
// 	// logical
// 	$and: {
// 		controlsEvaluation: true,
// 		apply: (operand, inputData, { apply }) =>
// 			operand.map((op) => apply(op, inputData)).join("&"),
// 	},
// 	// comparative
// 	$eq: {
// 		apply: (operand, inputData) => `${inputData}=${operand}`,
// 	},
// 	$lt: {
// 		apply: (operand, inputData) => `${inputData}[$lt]=${operand}`,
// 	},
// };

// const apiWhereEngine = createExpressionEngine(apiExtractors);
// export function extractWhereApi(where) {
// 	return extractWhere(where, apiWhereEngine);
// }

// const graphqlWhereEngine = createExpressionEngine({
// 	...pick(defaultExpressions, ["$pipe", "$compose"]),
// 	// core
// 	$get: {
// 		apply: (operand) => operand,
// 	},
// 	// logical
// 	$and: {
// 		controlsEvaluation: true,
// 		apply: (operand, inputData, { apply }) =>
// 			operand.map((op) => apply(op, inputData)).join(", "),
// 	},
// 	// comparative
// 	$eq: {
// 		apply: (operand, inputData) => `${inputData}: ${operand}`,
// 	},
// 	$lt: {
// 		apply: (operand, inputData) => `${inputData}_lt: ${operand}`,
// 	},
// });

// export function extractWhereGraphql(where) {
// 	return `(${extractWhere(where, graphqlWhereEngine)})`;
// }

// /**
//  * Extracts field and value from a normalized where expression
//  * @param {Object} expression - Normalized expression
//  * @returns {{field: string, value: any, operator?: string} | null} - Extracted field/value or null if complex
//  */
// function extractSimpleFilter(expression) {
// 	// Handle $pipe expressions: { $pipe: [{ $get: "fieldName" }, { $eq: "value" }] }
// 	if (
// 		expression.$pipe &&
// 		Array.isArray(expression.$pipe) &&
// 		expression.$pipe.length === 2
// 	) {
// 		const [getter, operator] = expression.$pipe;

// 		if (getter.$get && typeof getter.$get === "string") {
// 			const field = getter.$get;

// 			// Handle simple operators
// 			if (operator.$eq !== undefined) return { field, value: operator.$eq };
// 			if (operator.$ne !== undefined) {
// 				return { field, value: operator.$ne, operator: "$ne" };
// 			}
// 			if (operator.$gt !== undefined) {
// 				return { field, value: operator.$gt, operator: "$gt" };
// 			}
// 			if (operator.$gte !== undefined) {
// 				return { field, value: operator.$gte, operator: "$gte" };
// 			}
// 			if (operator.$lt !== undefined) {
// 				return { field, value: operator.$lt, operator: "$lt" };
// 			}
// 			if (operator.$lte !== undefined) {
// 				return { field, value: operator.$lte, operator: "$lte" };
// 			}
// 			if (operator.$in !== undefined) {
// 				return { field, value: operator.$in, operator: "$in" };
// 			}
// 			if (operator.$nin !== undefined) {
// 				return { field, value: operator.$nin, operator: "$nin" };
// 			}
// 			if (operator.$matchesRegex !== undefined) {
// 				return {
// 					field,
// 					value: operator.$matchesRegex,
// 					operator: "$matchesRegex",
// 				};
// 			}
// 			if (operator.$matchesLike !== undefined) {
// 				return {
// 					field,
// 					value: operator.$matchesLike,
// 					operator: "$matchesLike",
// 				};
// 			}
// 			if (operator.$matchesGlob !== undefined) {
// 				return {
// 					field,
// 					value: operator.$matchesGlob,
// 					operator: "$matchesGlob",
// 				};
// 			}
// 		}
// 	}

// 	// Can't extract simple field/value - this is a complex expression
// 	return null;
// }

// /**
//  * Extracts simple filters from normalized where expressions
//  * @param {Object} whereExpression - Normalized where expression
//  * @param {string} pathPrefix - Field path prefix for nested queries
//  * @returns {Object<string, any>} - Simple field->value filters
//  */
// function extractFiltersFromWhere(whereExpression, pathPrefix = "") {
// 	const filters = {};

// 	// Handle $and expressions - extract all simple filters
// 	if (whereExpression.$and && Array.isArray(whereExpression.$and)) {
// 		whereExpression.$and.forEach((subExpr) => {
// 			const subFilters = extractFiltersFromWhere(subExpr, pathPrefix);
// 			Object.assign(filters, subFilters);
// 		});
// 		return filters;
// 	}

// 	// Try to extract simple field/value
// 	const simple = extractSimpleFilter(whereExpression);
// 	if (simple) {
// 		const fullFieldPath = pathPrefix
// 			? `${pathPrefix}.${simple.field}`
// 			: simple.field;
// 		if (simple.operator) {
// 			// For non-equality operators, preserve the operator structure
// 			filters[fullFieldPath] = { [simple.operator]: simple.value };
// 		} else {
// 			// For equality, just store the value
// 			filters[fullFieldPath] = simple.value;
// 		}
// 		return filters;
// 	}

// 	// For complex expressions ($or, $not, complex $pipe), store the full expression
// 	// This allows formatters to decide how to handle complex cases
// 	if (pathPrefix) {
// 		filters[`${pathPrefix}._complex`] = whereExpression;
// 	} else {
// 		filters["_complex"] = whereExpression;
// 	}

// 	return filters;
// }

// /**
//  * Extracts structured parameters from a Data Prism query
//  * @param {import('@data-prism/core').Schema} schema - The schema
//  * @param {import('@data-prism/core').RootQuery} query - The query to analyze
//  * @returns {QueryParameters} Structured query parameters
//  */
// export function extractQueryParameters(schema, query) {
// 	const normalizedQuery = normalizeQuery(schema, query);
// 	const breakdown = flattenQuery(schema, normalizedQuery);

// 	const fields = {};
// 	const includes = [];
// 	const filters = {};

// 	breakdown.forEach((item) => {
// 		// Collect fields for each resource type
// 		if (item.attributes.length > 0) {
// 			fields[item.type] = uniq([
// 				...(fields[item.type] ?? []),
// 				...item.attributes,
// 			]);
// 		}

// 		// Collect includes (skip root level)
// 		if (item.parent) {
// 			includes.push(item.path.join("."));
// 		}

// 		// Extract filters from normalized where expressions
// 		if (item.query.where) {
// 			const pathPrefix = item.path.join(".");
// 			const itemFilters = extractFiltersFromWhere(item.query.where, pathPrefix);
// 			Object.assign(filters, itemFilters);
// 		}
// 	});

// 	// Extract sort parameters
// 	const sort =
// 		normalizedQuery.order?.flatMap((orderObj) =>
// 			Object.entries(orderObj).map(([field, direction]) => ({
// 				field,
// 				direction,
// 			})),
// 		) ?? [];

// 	// Extract pagination
// 	const pagination = {
// 		limit: query.limit,
// 		offset: query.offset ?? 0,
// 	};

// 	return {
// 		fields,
// 		includes,
// 		sort,
// 		pagination,
// 		filters,
// 	};
// }

// /**
//  * Builds a complete query URL using a parameter formatter
//  * @param {import('@data-prism/core').Schema} schema - The schema
//  * @param {import('@data-prism/core').RootQuery} query - The query
//  * @param {string} baseURL - Base URL for the API
//  * @param {ParameterFormatter} formatter - Parameter formatting strategy
//  * @returns {string} Complete formatted URL
//  */
// export function buildQueryURL(schema, query, baseURL, formatter) {
// 	const params = extractQueryParameters(schema, query);

// 	const parameterStrings = [
// 		params.fields && Object.keys(params.fields).length > 0
// 			? formatter.formatFields(params.fields)
// 			: null,
// 		params.includes.length > 0
// 			? formatter.formatIncludes(params.includes)
// 			: null,
// 		params.sort.length > 0 ? formatter.formatSort(params.sort) : null,
// 		params.pagination.limit
// 			? formatter.formatPagination(params.pagination)
// 			: null,
// 		Object.keys(params.filters).length > 0
// 			? formatter.formatFilters(params.filters)
// 			: null,
// 	].filter(Boolean);

// 	const path = formatter.formatPath(baseURL, query.type, query.id);
// 	const queryString = formatter.combineParameters(parameterStrings);

// 	return queryString ? `${path}?${queryString}` : path;
// }

// // === BUILT-IN FORMATTERS ===

// /**
//  * JSON:API specification compliant formatter
//  * @type {ParameterFormatter}
//  */
// export const jsonApiFormatter = {
// 	formatFields: (fields) => {
// 		return Object.entries(fields)
// 			.map(([type, attrs]) => `fields[${type}]=${attrs.join(",")}`)
// 			.join("&");
// 	},

// 	formatIncludes: (includes) => {
// 		return `include=${includes.join(",")}`;
// 	},

// 	formatSort: (sort) => {
// 		const sortFields = sort.map(({ field, direction }) =>
// 			direction === "desc" ? `-${field}` : field,
// 		);
// 		return `sort=${sortFields.join(",")}`;
// 	},

// 	formatPagination: ({ limit, offset = 0 }) => {
// 		const pageNumber = Math.floor(offset / limit) + 1;
// 		const pageSize = limit + (offset % limit);
// 		return `page[number]=${pageNumber}&page[size]=${pageSize}`;
// 	},

// 	formatFilters: (filters) => {
// 		const formatFilterValue = (key, value) => {
// 			// Skip complex expressions that can't be converted to simple filters
// 			if (key.endsWith("._complex") || key === "_complex") {
// 				// JSON:API doesn't have a standard way to handle complex expressions
// 				// Store builders can override this behavior if needed
// 				return null;
// 			}

// 			if (typeof value === "object" && value !== null) {
// 				// Handle expression objects like { $gt: 100 }
// 				return Object.entries(value)
// 					.map(([op, val]) => `filter[${key}][${op}]=${val}`)
// 					.join("&");
// 			}
// 			return `filter[${key}]=${value}`;
// 		};

// 		return Object.entries(filters)
// 			.map(([key, value]) => formatFilterValue(key, value))
// 			.filter(Boolean)
// 			.join("&");
// 	},

// 	formatPath: (baseURL, resourceType, resourceId) => {
// 		const path = resourceId ? `${resourceType}/${resourceId}` : resourceType;
// 		return `${baseURL}/${path}`;
// 	},

// 	combineParameters: (params) => params.join("&"),
// };

// /**
//  * Simple REST API formatter (common query parameter patterns)
//  * @type {ParameterFormatter}
//  */
// export const restApiFormatter = {
// 	formatFields: (fields) => {
// 		// Simple fields=field1,field2 approach
// 		const allFields = Object.values(fields).flat();
// 		return `fields=${uniq(allFields).join(",")}`;
// 	},

// 	formatIncludes: (includes) => {
// 		return `include=${includes.join(",")}`;
// 	},

// 	formatSort: (sort) => {
// 		const sortFields = sort.map(({ field, direction }) =>
// 			direction === "desc" ? `-${field}` : field,
// 		);
// 		return `sort=${sortFields.join(",")}`;
// 	},

// 	formatPagination: ({ limit, offset = 0 }) => {
// 		return `limit=${limit}&offset=${offset}`;
// 	},

// 	formatFilters: (filters) => {
// 		return Object.entries(filters)
// 			.map(([key, value]) => {
// 				// Skip complex expressions
// 				if (key.endsWith("._complex") || key === "_complex") {
// 					return null;
// 				}

// 				if (typeof value === "object" && value !== null) {
// 					// Convert expressions to simple operators
// 					return Object.entries(value)
// 						.map(([op, val]) => {
// 							const operator = op.replace("$", ""); // Remove $ prefix
// 							return `${key}[${operator}]=${val}`;
// 						})
// 						.join("&");
// 				}
// 				return `${key}=${value}`;
// 			})
// 			.filter(Boolean)
// 			.join("&");
// 	},

// 	formatPath: (baseURL, resourceType, resourceId) => {
// 		const path = resourceId ? `${resourceType}/${resourceId}` : resourceType;
// 		return `${baseURL}/${path}`;
// 	},

// 	combineParameters: (params) => params.join("&"),
// };

// /**
//  * OData-style formatter
//  * @type {ParameterFormatter}
//  */
// export const oDataFormatter = {
// 	formatFields: (fields) => {
// 		const allFields = Object.values(fields).flat();
// 		return `$select=${uniq(allFields).join(",")}`;
// 	},

// 	formatIncludes: (includes) => {
// 		return `$expand=${includes.join(",")}`;
// 	},

// 	formatSort: (sort) => {
// 		const sortFields = sort.map(
// 			({ field, direction }) => `${field} ${direction}`,
// 		);
// 		return `$orderby=${sortFields.join(",")}`;
// 	},

// 	formatPagination: ({ limit, offset = 0 }) => {
// 		return `$top=${limit}&$skip=${offset}`;
// 	},

// 	formatFilters: (filters) => {
// 		const formatFilterValue = (key, value) => {
// 			// Skip complex expressions
// 			if (key.endsWith("._complex") || key === "_complex") {
// 				return null;
// 			}

// 			if (typeof value === "object" && value !== null) {
// 				return Object.entries(value)
// 					.map(([op, val]) => {
// 						// Convert Data Prism operators to OData operators
// 						const odataOp =
// 							{
// 								$eq: "eq",
// 								$ne: "ne",
// 								$gt: "gt",
// 								$gte: "ge",
// 								$lt: "lt",
// 								$lte: "le",
// 							}[op] || op.replace("$", "");

// 						return `${key} ${odataOp} ${typeof val === "string" ? `'${val}'` : val}`;
// 					})
// 					.join(" and ");
// 			}
// 			return `${key} eq ${typeof value === "string" ? `'${value}'` : value}`;
// 		};

// 		const filterExpressions = Object.entries(filters)
// 			.map(([key, value]) => formatFilterValue(key, value))
// 			.filter(Boolean);

// 		return filterExpressions.length > 0
// 			? `$filter=${filterExpressions.join(" and ")}`
// 			: "";
// 	},

// 	formatPath: (baseURL, resourceType, resourceId) => {
// 		const path = resourceId ? `${resourceType}('${resourceId}')` : resourceType;
// 		return `${baseURL}/${path}`;
// 	},

// 	combineParameters: (params) => params.join("&"),
// };
