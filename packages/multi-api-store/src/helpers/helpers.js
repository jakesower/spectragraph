import { mapValues } from "es-toolkit";

// /**
//  * Compiles a template formatter that can substitute variables based on a pivot value.
//  *
//  * @param {Object} templates - Object mapping pivot values to template strings
//  * @param {string} pivot - The property name to use as the pivot for template selection
//  * @param {Array<string>} keys - Array of variable names that can be substituted in templates
//  * @returns {Function} Formatter function that takes variables and returns formatted string
//  */
// export function compileFormatter(templates, pivot, keys) {
// 	const fns = mapValues(
// 		templates,
// 		(template) => (vars) =>
// 			keys.reduce((acc, k) => acc.replaceAll(`$\{${k}}`, vars[k]), template),
// 	);
// 	return (vars) => fns[vars[pivot]](vars);
// }

// /**
//  * Compiles a WHERE clause formatter for query conditions.
//  *
//  * @param {Object} templates - Templates for different expression types
//  * @returns {Function} Formatter function for WHERE expressions
//  */
// export function compileWhereFormatter(templates) {
// 	return compileFormatter(templates, "expressionName", ["attribute", "value"]);
// }

// /**
//  * Compiles an ORDER BY formatter for query sorting.
//  *
//  * @param {Object} templates - Templates for different sort directions
//  * @returns {Function} Formatter function for ORDER BY clauses
//  */
// export function compileOrderFormatter(templates) {
// 	return compileFormatter(templates, "direction", ["attribute"]);
// }

/**
 * Compiles resource mappers for transforming API responses to match schema expectations.
 *
 * @param {import('@spectragraph/core').Schema} schema - Schema definition
 * @param {string} type - Resource type name
 * @param {Object} mappers - Mappings from API response field names to schema field names
 * @returns {Function} Mapper function that transforms API responses
 */
function compileResourceMappers(schema, type, mappers) {
	const resSchema = schema.resources[type];
	const mappable = { ...resSchema.attributes, ...resSchema.relationships };
	const fns = mapValues(mappable, (_, name) => {
		if (name in mappers) {
			if (typeof mappers[name] === "function") {
				return mappers[name];
			} else if (typeof mappers[name] === "string") {
				return (val) => val[mappers[name]];
			} else {
				throw new Error("mappers must be functions or strings");
			}
		}

		return (val) => val[name];
	});

	return (resource, context) =>
		Object.entries(fns).reduce((acc, [key, fn]) => {
			const val = fn(resource, context);
			return val === undefined ? acc : { ...acc, [key]: val };
		}, {});
}

/**
 * Normalizes resource configuration to the internal format
 * Supports multiple input formats:
 * 1. Function shorthand: `{ users: fetchFn }` -> `{ users: { query: { fetch: fetchFn } } }`
 * 2. Operation shorthand: `{ users: { query: fetchFn } }` -> `{ users: { query: { fetch: fetchFn } } }`
 * 3. Full format: `{ users: { query: { fetch: fn, map: fn } } }` -> unchanged
 *
 * @param {import('./default-config.js').Config} config - Resource configuration to normalize
 * @param {string|null} type - The type of resource
 * @param {import("@spectragraph/core").Schema} schema - The store's schema
 * @returns {import('../default-config.js').NormalConfig} Normalized configuration with flattened operations
 */
export function normalizeConfig(config, type = null, schema = {}) {
	const operations = ["query", "create", "update", "delete"];

	const compileOpMappers = (opConfig) => {
		const configured = {
			...opConfig,
			...(type && opConfig.mappers && schema?.resources?.[type]
				? opConfig.map
					? { map: opConfig.map }
					: { map: compileResourceMappers(schema, type, opConfig.mappers) }
				: {}),
		};
		delete configured.mappers;
		return configured;
	};

	return operations.reduce(
		(acc, op) =>
			config[op]
				? {
						...acc,
						[op]:
							typeof config[op] === "function"
								? { fetch: config[op] }
								: compileOpMappers(config[op]),
					}
				: acc,
		config,
	);
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
