// Now using shared sql-helpers package
import { createColumnTypeModifiers } from "@data-prism/sql-helpers";

// SQLite-specific boolean handling
const sqliteBooleanModifier = {
	extract: (val) => (val === 1 ? true : val === 0 ? false : val),
	select: (val) => val,
	store: (val) => (typeof val === "boolean" ? (val ? 1 : 0) : val),
};

export const columnTypeModifiers = createColumnTypeModifiers({
	boolean: sqliteBooleanModifier,
});
