'use strict';

/**
 * Applies a function to an item or maps it over an array of items
 * @param {*} itemItemsOrNull - Single item, array of items, or null/undefined
 * @param {function} fn - Function to apply to each item
 * @returns {*} The result of applying fn to the item(s), or null/undefined if input was null/undefined
 */
function applyOrMap(itemItemsOrNull, fn) {
	if (itemItemsOrNull == null) return itemItemsOrNull;

	return Array.isArray(itemItemsOrNull) ? itemItemsOrNull.map(fn) : fn(itemItemsOrNull);
}

/**
 * Applies an async function to an item or maps it over an array of items
 * @param {*} itemItemsOrNull - Single item, array of items, or null
 * @param {function} asyncFn - Async function to apply to each item
 * @returns {Promise<*>} Promise resolving to the result of applying asyncFn to the item(s), or null if input was null
 */
function applyOrMapAsync(itemItemsOrNull, asyncFn) {
	if (itemItemsOrNull === null) return itemItemsOrNull;

	return Array.isArray(itemItemsOrNull)
		? Promise.all(itemItemsOrNull.map(asyncFn))
		: asyncFn(itemItemsOrNull);
}

/**
 * Pipes a value through a series of functions
 * @param {*} init - Initial value
 * @param {function[]} fns - Array of functions to pipe the value through
 * @returns {*} The result after applying all functions in sequence
 */
function pipeThru(init, fns) {
	return fns.reduce(
		(onion, fn) => (val) => fn(onion(val)),
		(val) => val,
	)(init);
}

exports.applyOrMap = applyOrMap;
exports.applyOrMapAsync = applyOrMapAsync;
exports.pipeThru = pipeThru;
