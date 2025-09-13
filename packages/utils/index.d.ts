// TypeScript definitions for @spectragraph/utils
// Generated from JSDoc annotations

/**
 * Applies a function to an item or maps it over an array of items.
 * Handles null and undefined gracefully by returning them unchanged.
 */
export function applyOrMap<T, R>(
	itemItemsOrNull: T | T[] | null | undefined,
	fn: (item: T) => R
): R | R[] | null | undefined;

/**
 * Applies an async function to an item or maps it over an array of items.
 * Handles null and undefined gracefully by returning them unchanged.
 */
export function applyOrMapAsync<T, R>(
	itemItemsOrNull: T | T[] | null | undefined,
	asyncFn: (item: T) => Promise<R>
): Promise<R | R[]> | null | undefined;

/**
 * Pipes a value through a series of functions in sequence.
 * Each function receives the result of the previous function.
 */
export function pipeThru<T>(init: T, fns: Array<(val: any) => any>): any;