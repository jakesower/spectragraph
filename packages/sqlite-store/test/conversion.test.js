import { describe, expect, it } from "vitest";
import { flattenQuery } from "../src/helpers/query-helpers.js";

// Simple test to verify the TypeScript to JSDoc conversion worked
describe("TypeScript to JSDoc conversion", () => {
	it("can import and call flattenQuery function", () => {
		const schema = {
			resources: {
				users: {
					attributes: { name: { type: "string" } },
					relationships: {}
				}
			}
		};
		
		const query = {
			type: "users",
			select: { name: "name" }
		};

		// This should not throw an error if the conversion worked
		const result = flattenQuery(schema, query);
		expect(Array.isArray(result)).toBe(true);
		expect(result.length).toBe(1);
		expect(result[0].type).toBe("users");
	});
});