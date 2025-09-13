// Now using shared sql-helpers package
import { extractGraph as extractGraphShared } from "@spectragraph/sql-helpers";
import { columnTypeModifiers } from "./column-type-modifiers.js";

// Wrapper function that provides columnTypeModifiers to the shared extractGraph
export function extractGraph(rawResults, selectClause, context) {
	return extractGraphShared(rawResults, selectClause, {
		...context,
		columnTypeModifiers,
	});
}
