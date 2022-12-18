export type JsonSchemaType =
	| "string"
	| "number"
	| "integer"
	| "boolean"
	| "null"
	| "array"
	| "object";

// export function detectJsonSchemaType(records: any[]): PropertyType[] {

// }

export function detectJsonSchemaType(val: unknown): JsonSchemaType {
	if (val === null) return "null";
	if (typeof val === "number") return Number.isInteger(val) ? "integer" : "number";
	if (typeof val === "boolean") return "boolean";
	if (typeof val === "object") return Array.isArray(val) ? "array" : "object";

	return "string";
}
