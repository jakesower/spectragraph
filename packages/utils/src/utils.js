/**
 * @template T
 * @template R
 * @typedef {T | T[] | null | undefined} ItemItemsOrNull
 */

/**
 * Parses a path string into segments, supporting both dot and bracket notation.
 *
 * @param {string} path - The path string to parse
 * @returns {Array<string>} Array of path segments
 *
 * @example
 * parsePath("foo.bar") // ["foo", "bar"]
 * parsePath("foo[0].bar") // ["foo", "0", "bar"]
 * parsePath("foo[$].bar") // ["foo", "$", "bar"]
 * parsePath("foo[0][1]") // ["foo", "0", "1"]
 */
function parsePath(path) {
	// Fast path for simple dot notation (no brackets)
	if (!path.includes("[")) {
		return path.split(".");
	}

	const segments = [];
	let current = "";
	let inBracket = false;

	for (let i = 0; i < path.length; i++) {
		const char = path[i];

		if (char === "[") {
			if (current) {
				segments.push(current);
				current = "";
			}
			inBracket = true;
		} else if (char === "]") {
			if (inBracket && current) {
				segments.push(current);
				current = "";
			}
			inBracket = false;
		} else if (char === "." && !inBracket) {
			if (current) {
				segments.push(current);
				current = "";
			}
		} else {
			current += char;
		}
	}

	if (current) {
		segments.push(current);
	}

	return segments;
}

/**
 * Applies a function to an item or maps it over an array of items.
 * Handles null and undefined gracefully by returning them unchanged.
 *
 * @template T
 * @template R
 * @param {ItemItemsOrNull<T>} itemItemsOrNull - Single item, array of items, or null/undefined
 * @param {function(T): R} fn - Function to apply to each item
 * @returns {R | R[] | null | undefined} The result of applying fn to the item(s), or null/undefined if input was null/undefined
 *
 * @example
 * applyOrMap(5, x => x * 2)           // Returns: 10
 * applyOrMap([1, 2, 3], x => x * 2)   // Returns: [2, 4, 6]
 * applyOrMap(null, x => x * 2)        // Returns: null
 * applyOrMap(undefined, x => x * 2)   // Returns: undefined
 */
export function applyOrMap(itemItemsOrNull, fn) {
	if (itemItemsOrNull === null || itemItemsOrNull === undefined) {
		return itemItemsOrNull;
	}

	return Array.isArray(itemItemsOrNull)
		? itemItemsOrNull.map(fn)
		: fn(itemItemsOrNull);
}

/**
 * Applies an async function to an item or maps it over an array of items.
 * Handles null and undefined gracefully by returning them unchanged.
 *
 * @template T
 * @template R
 * @param {ItemItemsOrNull<T>} itemItemsOrNull - Single item, array of items, or null/undefined
 * @param {function(T): Promise<R>} asyncFn - Async function to apply to each item
 * @returns {Promise<R | R[]> | null | undefined} Promise resolving to the result of applying asyncFn to the item(s), or null/undefined if input was null/undefined
 *
 * @example
 * await applyOrMapAsync(5, async x => x * 2)           // Returns: 10
 * await applyOrMapAsync([1, 2, 3], async x => x * 2)   // Returns: [2, 4, 6]
 * applyOrMapAsync(null, async x => x * 2)              // Returns: null
 * applyOrMapAsync(undefined, async x => x * 2)         // Returns: undefined
 */
export function applyOrMapAsync(itemItemsOrNull, asyncFn) {
	if (itemItemsOrNull === null || itemItemsOrNull === undefined) {
		return itemItemsOrNull;
	}

	return Array.isArray(itemItemsOrNull)
		? Promise.all(itemItemsOrNull.map(asyncFn))
		: asyncFn(itemItemsOrNull);
}

/**
 * Gets a value from an object using a property path.
 * Supports the $ wildcard for array element iteration and flattening.
 * Supports both dot notation and bracket notation.
 *
 * @param {Object|Array} objOrArray - The object or array to query
 * @param {string | Array} path - The path of the property to get. Use "$" to iterate over array elements.
 * @param {boolean} [allowWildcards=false] - Whether to allow wildcard ($) in paths
 * @returns {*} Returns the resolved value, or undefined if not found
 *
 * @example
 * // Simple property access
 * const bear = {
 *   name: "Tenderheart Bear",
 *   yearIntroduced: 1982,
 *   home: { name: "Care-a-Lot" }
 * };
 * get(bear, "name")              // "Tenderheart Bear"
 * get(bear, "home.name")         // "Care-a-Lot"
 * get(bear, "bestFriend")        // undefined (property doesn't exist)
 *
 * @example
 * // Bracket notation
 * const bears = [
 *   { name: "Tenderheart Bear" },
 *   { name: "Cheer Bear" }
 * ];
 * get(bears, "[0].name")         // "Tenderheart Bear"
 * get(bears, "[1].name")         // "Cheer Bear"
 *
 * @example
 * // Wildcard ($) for array iteration
 * const bear = {
 *   name: "Wish Bear",
 *   powers: [
 *     { name: "Care Bear Stare" },
 *     { name: "Make a Wish" }
 *   ]
 * };
 * get(bear, "powers.$.name", true)  // ["Care Bear Stare", "Make a Wish"]
 *
 * @example
 * // Nested wildcards
 * const home = {
 *   name: "Care-a-Lot",
 *   residents: [
 *     {
 *       name: "Tenderheart Bear",
 *       powers: [{ name: "Care Bear Stare" }]
 *     },
 *     {
 *       name: "Cheer Bear",
 *       powers: [{ name: "Care Bear Stare" }]
 *     }
 *   ]
 * };
 * get(home, "residents.$.name", true)           // ["Tenderheart Bear", "Cheer Bear"]
 * get(home, "residents.$.powers.$.name", true)  // ["Care Bear Stare", "Care Bear Stare"]
 */
export function get(objOrArray, path, allowWildcards = false) {
	if (objOrArray === null || objOrArray === undefined) return null;
	if (path === "" || path === "." || path.length === 0) return objOrArray;

	// Convert the path to an array if it's not already
	const pathArray = Array.isArray(path) ? path : parsePath(path);

	let current = objOrArray;

	for (let i = 0; i < pathArray.length; i++) {
		const segment = pathArray[i];

		// Handle wildcard array iteration
		if (segment === "$") {
			if (!allowWildcards) {
				const pathStr = Array.isArray(path) ? path.join(".") : path;
				throw new Error(
					`Wildcard ($) not supported in this context. Path: "${pathStr}"`,
				);
			}

			const asArray = Array.isArray(current) ? current : [current];
			const remainingPath = pathArray.slice(i + 1);

			// If no remaining path, return the array
			if (remainingPath.length === 0) return asArray;

			// Recursively get from each array element
			return asArray.flatMap((item) =>
				get(item, remainingPath, allowWildcards),
			);
		}

		// Normal property access
		current = current?.[segment];

		if (current === null || current === undefined) return current;
	}

	return current;
}

/**
 * Pipes a value through a series of functions in sequence.
 * Each function receives the result of the previous function.
 *
 * @template T
 * @param {T} init - Initial value to pipe through the functions
 * @param {Array<function(*): *>} fns - Array of functions to pipe the value through
 * @returns {*} The result after applying all functions in sequence
 *
 * @example
 * const add5 = x => x + 5;
 * const multiply2 = x => x * 2;
 * const toString = x => x.toString();
 *
 * pipeThru(10, [add5, multiply2, toString]) // Returns: "30"
 */
export function pipeThru(init, fns) {
	return fns.reduce((acc, fn) => fn(acc), init);
}

/**
 * Takes an object with promises as values and returns a single promise
 * that resolves to an object with all the promises resolved.
 *
 * @template {Record<string, Promise<any>>} T
 * @param {T} obj - Object with promises as values
 * @returns {Promise<{[K in keyof T]: Awaited<T[K]>}>} Promise that resolves to object with resolved values
 *
 * @example
 * const obj = {
 *   a: Promise.resolve(1),
 *   b: Promise.resolve(2),
 *   c: Promise.resolve(3)
 * };
 * const resolved = await promiseObjectAll(obj);
 * // resolved: { a: 1, b: 2, c: 3 }
 */
export function promiseObjectAll(obj) {
	return Promise.all(
		Object.entries(obj).map(async ([key, promise]) => [key, await promise]),
	).then(Object.fromEntries);
}
