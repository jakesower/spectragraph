// Now using shared sql-helpers package
export {
	flattenQuery,
	flatMapQuery,
	forEachQuery,
	reduceQuery,
	someQuery,
} from "@data-prism/sql-helpers";

/**
 * Replaces ? placeholders with PostgreSQL $n placeholders
 * @param {string} inputString - Input SQL string with ? placeholders
 * @returns {string} SQL string with $n placeholders
 */
export function replacePlaceholders(inputString) {
	let counter = 1;
	return inputString.replace(/\?/g, () => `$${counter++}`);
}
