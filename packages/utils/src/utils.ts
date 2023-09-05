// export { tabularize } from "./tree.js";

export function applyOrMap(itemItemsOrNull, fn) {
	if (itemItemsOrNull == null) return itemItemsOrNull;

	return Array.isArray(itemItemsOrNull) ? itemItemsOrNull.map(fn) : fn(itemItemsOrNull);
}

export function applyOrMapAsync(itemItemsOrNull, asyncFn) {
	if (itemItemsOrNull === null) return itemItemsOrNull;

	return Array.isArray(itemItemsOrNull)
		? Promise.all(itemItemsOrNull.map(asyncFn))
		: asyncFn(itemItemsOrNull);
}

export function pipeThru(init, fns) {
	return fns.reduce(
		(onion, fn) => (val) => fn(onion(val)),
		(val) => val,
	)(init);
}
