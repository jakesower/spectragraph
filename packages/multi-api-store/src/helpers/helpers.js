import { mapValues } from "es-toolkit";

/**
 * Compiles a template formatter that can substitute variables based on a pivot value.
 *
 * @param {Object} templates - Object mapping pivot values to template strings
 * @param {string} pivot - The property name to use as the pivot for template selection
 * @param {Array<string>} keys - Array of variable names that can be substituted in templates
 * @returns {Function} Formatter function that takes variables and returns formatted string
 */
export function compileFormatter(templates, pivot, keys) {
	const fns = mapValues(
		templates,
		(template) => (vars) =>
			keys.reduce((acc, k) => acc.replaceAll(`$\{${k}}`, vars[k]), template),
	);
	return (vars) => fns[vars[pivot]](vars);
}

/**
 * Compiles a WHERE clause formatter for query conditions.
 *
 * @param {Object} templates - Templates for different expression types
 * @returns {Function} Formatter function for WHERE expressions
 */
export function compileWhereFormatter(templates) {
	return compileFormatter(templates, "expressionName", ["attribute", "value"]);
}

/**
 * Compiles an ORDER BY formatter for query sorting.
 *
 * @param {Object} templates - Templates for different sort directions
 * @returns {Function} Formatter function for ORDER BY clauses
 */
export function compileOrderFormatter(templates) {
	return compileFormatter(templates, "direction", ["attribute"]);
}

/**
 * Compiles resource mappers for transforming API responses to match schema expectations.
 *
 * @param {import('@spectragraph/core').Schema} schema - Schema definition
 * @param {string} type - Resource type name
 * @param {Object} mappers - Mapping configuration
 * @param {Object} [mappers.fromApi] - Mappings from API response field names to schema field names
 * @returns {Function} Mapper function that transforms API responses
 */
export function compileResourceMappers(schema, type, mappers) {
	const resSchema = schema.resources[type];
	const mappable = { ...resSchema.attributes, ...resSchema.relationships };
	const fromApiMappers = mappers.fromApi ?? {};
	const fns = mapValues(mappable, (_, name) => {
		if (name in fromApiMappers) {
			if (typeof fromApiMappers[name] === "function") {
				return fromApiMappers[name];
			} else if (typeof fromApiMappers[name] === "string") {
				return (val) => val[fromApiMappers[name]];
			} else {
				throw new Error("mappers must be functions or strings");
			}
		}

		return (val) => val[name];
	});

	return (resource) =>
		Object.entries(fns).reduce((acc, [key, fn]) => {
			const val = fn(resource);
			return val === undefined ? acc : { ...acc, [key]: val };
		}, {});
}

/**
 * Builds an async middleware pipeline that executes middleware functions in sequence.
 *
 * @param {Array<Function>} middleware - Array of middleware functions
 * @returns {Function} Pipeline function that executes middleware and final handler
 */
export function buildAsyncMiddlewarePipe(middleware) {
	const init = (val) => val;
	return middleware.reduceRight((onion, mw) => (val) => mw(val, onion), init);
}

/**
 * Handles Response objects from handlers, extracting data with error handling.
 *
 * @param {Response|*} response - Response object or direct data
 * @param {*} [fallbackValue] - Value to return for empty successful responses
 * @returns {Promise<*>} Parsed data or original value
 * @throws {Error} When response indicates an error status
 */
export async function handleResponseData(response, fallbackValue) {
	// Handle Response objects
	if (response && typeof response.ok === "boolean") {
		if (!response.ok) {
			const errorData = await response.json().catch(() => ({
				message: response.statusText,
			}));
			throw new Error(errorData.message || `HTTP ${response.status}`, {
				cause: { data: errorData, originalError: response },
			});
		}

		// Handle empty responses with fallback
		if (fallbackValue !== undefined) {
			const text = await response.text();
			return text ? JSON.parse(text) : fallbackValue;
		}

		return await response.json();
	}

	// Handle direct data returns
	return response;
}

/**
 * Handles fetch Response objects and extracts JSON data, with error handling.
 * Supports both Response objects (from fetch) and direct data returns.
 *
 * @param {Response|*} response - Response object from fetch or direct data
 * @returns {Promise<*>} Parsed JSON data from response or the original data
 * @throws {Error} When response indicates an error status
 */
export async function handleFetchResponse(response) {
	return handleResponseData(response);
}
