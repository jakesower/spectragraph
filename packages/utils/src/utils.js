/**
 * @template T
 * @template R
 * @typedef {T | T[] | null | undefined} ItemItemsOrNull
 */

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
