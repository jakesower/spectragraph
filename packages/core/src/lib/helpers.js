/**
 * @typedef {Object} StandardError
 * @property {string} message
 * @property {string} path
 * @property {string} code
 * @property {string} value
 */

import { get, uniqBy } from "lodash-es";

/**
 * Wraps a validation function so that if it returns any standardized errors, an Error is thrown.
 *
 * @param {Function} validationFn - Function that validates input and returns an array of error objects.
 * @returns {Function} Wrapped function that calls `validationFn` with the same arguments and throws
 * an Error if any errors are returned. The thrown Error will have its `cause` property set to the
 * original array of errors, and its message will be a comma-separated list of error messages.
 */
export function ensure(validationFn) {
	return (...args) => {
		const errors = validationFn(...args);

		if (errors.length > 0) {
			throw new Error(errors.map((e) => e.message).join("\n"), {
				cause: errors,
			});
		}
	};
}

/**
 * Manages a cache with multiple objects for keys. The object references should be STABLE or this cache will do very little.
 *
 * @returns {Function} Function that takes each object as an argument. Returns a function with hit, value, and set.
 */
export function createDeepCache() {
	const rootCache = new WeakMap();

	return (...rootKeys) => {
		const go = (keys, curCache) => {
			const [head, ...tail] = keys;

			if (tail.length === 0) {
				return {
					hit: curCache.has(head),
					value: curCache.get(head),
					set: (val) => curCache.set(head, val),
				};
			}

			let nextCache = curCache.get(head);
			if (!nextCache) {
				nextCache = new WeakMap();
				curCache.set(head, nextCache);
			}

			return go(tail, nextCache);
		};

		return go(rootKeys, rootCache);
	};
}

const errorKeywordFormatters = {
	enum: (error, dataVar) =>
		`[data-prism] ${dataVar}${error.instancePath} ${error.message} (${error.params?.allowedValues?.join(", ")})`,
};

/**
 * Converts AJV validation errors to standardized errors.
 *
 * @param {import('ajv').DefinedError[]} ajvErrors
 * @param {*} [subject=null] - The data being validated against the schema.
 * @param {string} [dataVar="data"] - A prefix to add to error paths.
 * @returns {Object[]} Standardized error objects
 */
export function translateAjvErrors(
	ajvErrors,
	subject = null,
	dataVar = "data",
) {
	const customErrors = ajvErrors.filter(
		(err) => err.keyword === "errorMessage",
	);
	const candidateErrors = customErrors.length > 0 ? customErrors : ajvErrors;
	const maxDepth = candidateErrors.reduce(
		(acc, err) => Math.max(acc, err.instancePath.split("/").length),
		-Infinity,
	);

	const topErrors = uniqBy(
		candidateErrors.filter(
			(err) => err.instancePath.split("/").length === maxDepth,
		),
		(err) => err.instancePath,
	);

	return topErrors.map((error) => ({
		...error,
		message: errorKeywordFormatters[error.keyword]
			? errorKeywordFormatters[error.keyword](error, dataVar)
			: `[data-prism] ${dataVar}${error.instancePath} ${error.message}`,
		path: error.instancePath ?? error.schemaPath,
		code: error.keyword,
		value: get(subject, error.instancePath?.replaceAll("/", ".")?.slice(1)),
		otherErrors: ajvErrors,
	}));
}
