// Now using shared sql-helpers package
import { extractQueryClauses as extractQueryClausesShared } from "@spectragraph/sql-helpers";
import { columnTypeModifiers } from "./column-type-modifiers.js";

/**
 * @typedef {import('./query.js').StoreContext} StoreContext
 */

// Wrapper function that provides columnTypeModifiers to the shared extractQueryClauses
export function extractQueryClauses(query, context) {
	return extractQueryClausesShared(query, {
		...context,
		columnTypeModifiers,
	});
}
