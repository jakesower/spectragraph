import { describe, expect, it } from "vitest";
import { storeMutation } from "../src/store.js";
import { soccerSchema } from "../../interface-tests/src/index.js";

describe("storeMutation", () => {
	describe("parameter validation", () => {
		it("throws error when no arguments provided", () => {
			const mutation = storeMutation(soccerSchema, "create", () => {});
			expect(() => mutation()).toThrow(
				'create must be of the form create("resourceType", flatResource) or create(normalResource)',
			);
		});

		it("throws error when only resourceType provided without flatResource", () => {
			const mutation = storeMutation(soccerSchema, "create", () => {});
			expect(() => mutation("fields")).toThrow(
				'create must be of the form create("resourceType", flatResource) or create(normalResource)',
			);
		});

		it("throws error when null provided as first argument", () => {
			const mutation = storeMutation(soccerSchema, "create", () => {});
			expect(() => mutation(null)).toThrow(
				'create must be of the form create("resourceType", flatResource) or create(normalResource)',
			);
		});

		it("throws error when undefined provided as first argument", () => {
			const mutation = storeMutation(soccerSchema, "update", () => {});
			expect(() => mutation(undefined)).toThrow(
				'update must be of the form update("resourceType", flatResource) or update(normalResource)',
			);
		});
	});

	describe("flat format (resourceType, flatResource)", () => {
		it("accepts flat format with attributes only", () => {
			let receivedResource;
			const mutation = storeMutation(soccerSchema, "create", (normalRes) => {
				receivedResource = normalRes;
				return normalRes;
			});

			mutation("fields", { name: "Coronado Beach Complex", surface: "turf" });

			expect(receivedResource).toMatchObject({
				type: "fields",
				attributes: {
					name: "Coronado Beach Complex",
					surface: "turf",
				},
				relationships: {},
			});
		});

		it("accepts flat format with attributes and relationships", () => {
			let receivedResource;
			const mutation = storeMutation(soccerSchema, "create", (normalRes) => {
				receivedResource = normalRes;
				return normalRes;
			});

			mutation("teams", {
				name: "Tucson Tidal Wave",
				homeField: "field-1",
			});

			expect(receivedResource).toMatchObject({
				type: "teams",
				attributes: {
					name: "Tucson Tidal Wave",
				},
				relationships: {
					homeField: { type: "fields", id: "field-1" },
				},
			});
		});

		it("accepts flat format with object relationships", () => {
			let receivedResource;
			const mutation = storeMutation(soccerSchema, "update", (normalRes) => {
				receivedResource = normalRes;
				return normalRes;
			});

			mutation("teams", {
				id: "team-1",
				name: "Phoenix Rising Tide",
				homeField: { id: "field-2" },
			});

			expect(receivedResource).toMatchObject({
				type: "teams",
				id: "team-1",
				attributes: {
					name: "Phoenix Rising Tide",
				},
				relationships: {
					homeField: { type: "fields", id: "field-2" },
				},
			});
		});

		it("accepts flat format with many cardinality relationships", () => {
			let receivedResource;
			const mutation = storeMutation(soccerSchema, "create", (normalRes) => {
				receivedResource = normalRes;
				return normalRes;
			});

			mutation("fields", {
				name: "Saguaro Shores Stadium",
				teams: ["team-1", "team-2"],
			});

			expect(receivedResource).toMatchObject({
				type: "fields",
				attributes: {
					name: "Saguaro Shores Stadium",
				},
				relationships: {
					teams: [
						{ type: "teams", id: "team-1" },
						{ type: "teams", id: "team-2" },
					],
				},
			});
		});

		it("accepts flat format with empty object", () => {
			let receivedResource;
			const mutation = storeMutation(soccerSchema, "create", (normalRes) => {
				receivedResource = normalRes;
				return normalRes;
			});

			mutation("fields", {});

			expect(receivedResource).toMatchObject({
				type: "fields",
				attributes: {},
				relationships: {},
			});
		});

		it("returns the result from the mutation function", () => {
			const mutation = storeMutation(soccerSchema, "create", (normalRes) => {
				return { ...normalRes, customField: "custom value" };
			});

			const result = mutation("fields", { name: "Tempe Marina Park" });

			expect(result).toHaveProperty("customField", "custom value");
		});
	});

	describe("normalized format (normalResource)", () => {
		it("accepts normalized format with type, attributes, and relationships", () => {
			let receivedResource;
			const mutation = storeMutation(soccerSchema, "create", (normalRes) => {
				receivedResource = normalRes;
				return normalRes;
			});

			mutation({
				type: "teams",
				attributes: { name: "Scottsdale Surf" },
				relationships: { homeField: { type: "fields", id: "field-1" } },
			});

			expect(receivedResource).toMatchObject({
				type: "teams",
				attributes: { name: "Scottsdale Surf" },
				relationships: { homeField: { type: "fields", id: "field-1" } },
			});
		});

		it("accepts normalized format with id", () => {
			let receivedResource;
			const mutation = storeMutation(soccerSchema, "update", (normalRes) => {
				receivedResource = normalRes;
				return normalRes;
			});

			mutation({
				type: "teams",
				id: "team-1",
				attributes: { name: "Mesa Maelstrom" },
			});

			expect(receivedResource).toMatchObject({
				type: "teams",
				id: "team-1",
				attributes: { name: "Mesa Maelstrom" },
			});
		});

		it("accepts normalized format with only type", () => {
			let receivedResource;
			const mutation = storeMutation(soccerSchema, "create", (normalRes) => {
				receivedResource = normalRes;
				return normalRes;
			});

			mutation({ type: "fields" });

			expect(receivedResource).toHaveProperty("type", "fields");
		});

		it("accepts normalized format with empty attributes and relationships", () => {
			let receivedResource;
			const mutation = storeMutation(soccerSchema, "create", (normalRes) => {
				receivedResource = normalRes;
				return normalRes;
			});

			mutation({
				type: "fields",
				attributes: {},
				relationships: {},
			});

			expect(receivedResource).toMatchObject({
				type: "fields",
				attributes: {},
				relationships: {},
			});
		});

		it("returns the result from the mutation function", () => {
			const mutation = storeMutation(soccerSchema, "upsert", (normalRes) => {
				return { ...normalRes, processed: true };
			});

			const result = mutation({
				type: "fields",
				attributes: { name: "Chandler Harbor Fields" },
			});

			expect(result).toHaveProperty("processed", true);
		});

		it("passes through normalized format without transformation", () => {
			let receivedResource;
			const mutation = storeMutation(soccerSchema, "create", (normalRes) => {
				receivedResource = normalRes;
				return normalRes;
			});

			const input = {
				type: "games",
				attributes: { homeScore: 2, awayScore: 1 },
				relationships: {
					homeTeam: { type: "teams", id: "team-1" },
					awayTeam: { type: "teams", id: "team-2" },
				},
			};

			mutation(input);

			expect(receivedResource).toEqual(input);
		});
	});

	describe("method name in error messages", () => {
		it("includes correct method name for create", () => {
			const mutation = storeMutation(soccerSchema, "create", () => {});
			expect(() => mutation()).toThrow(/create/);
		});

		it("includes correct method name for update", () => {
			const mutation = storeMutation(soccerSchema, "update", () => {});
			expect(() => mutation(null)).toThrow(/update/);
		});

		it("includes correct method name for upsert", () => {
			const mutation = storeMutation(soccerSchema, "upsert", () => {});
			expect(() => mutation(undefined)).toThrow(/upsert/);
		});
	});

	describe("integration with normalizeResource", () => {
		it("normalizes flat resources with custom idAttribute", () => {
			let receivedResource;
			const mutation = storeMutation(soccerSchema, "create", (normalRes) => {
				receivedResource = normalRes;
				return normalRes;
			});

			// games has idAttribute: "id"
			mutation("games", {
				id: 123,
				homeScore: 3,
				awayScore: 1,
			});

			expect(receivedResource).toMatchObject({
				type: "games",
				id: 123,
				attributes: {
					id: 123,
					homeScore: 3,
					awayScore: 1,
				},
			});
		});

		it("filters undefined attributes", () => {
			let receivedResource;
			const mutation = storeMutation(soccerSchema, "update", (normalRes) => {
				receivedResource = normalRes;
				return normalRes;
			});

			mutation("fields", {
				id: "field-1",
				name: "Yuma Bayfront Park",
				surface: undefined,
			});

			expect(receivedResource.attributes).not.toHaveProperty("surface");
			expect(receivedResource.attributes).toHaveProperty(
				"name",
				"Yuma Bayfront Park",
			);
		});

		it("filters undefined relationships", () => {
			let receivedResource;
			const mutation = storeMutation(soccerSchema, "update", (normalRes) => {
				receivedResource = normalRes;
				return normalRes;
			});

			mutation("teams", {
				id: "team-1",
				name: "Flagstaff Breakers",
				homeField: undefined,
			});

			expect(receivedResource.relationships).not.toHaveProperty("homeField");
		});

		it("handles null relationships correctly", () => {
			let receivedResource;
			const mutation = storeMutation(soccerSchema, "update", (normalRes) => {
				receivedResource = normalRes;
				return normalRes;
			});

			mutation("games", {
				id: "game-1",
				homeScore: 2,
				referee: null,
			});

			expect(receivedResource.relationships).toHaveProperty("referee", null);
		});

		it("handles empty array relationships", () => {
			let receivedResource;
			const mutation = storeMutation(soccerSchema, "create", (normalRes) => {
				receivedResource = normalRes;
				return normalRes;
			});

			mutation("fields", {
				name: "Glendale Cove Arena",
				teams: [],
			});

			expect(receivedResource.relationships).toHaveProperty("teams");
			expect(receivedResource.relationships.teams).toEqual([]);
		});
	});

	describe("edge cases", () => {
		it("handles resource with no attributes defined in schema", () => {
			let receivedResource;
			const mutation = storeMutation(soccerSchema, "create", (normalRes) => {
				receivedResource = normalRes;
				return normalRes;
			});

			mutation("fields", { extraField: "value" });

			// extraField is not in schema attributes, so it won't be in normalized resource
			expect(receivedResource.attributes).not.toHaveProperty("extraField");
		});

		it("handles resource with no relationships defined in schema", () => {
			let receivedResource;
			const mutation = storeMutation(soccerSchema, "create", (normalRes) => {
				receivedResource = normalRes;
				return normalRes;
			});

			mutation("referees", {
				name: "Marina Santiago",
				extraRel: "field-1",
			});

			// extraRel is not in schema relationships
			expect(receivedResource.relationships).not.toHaveProperty("extraRel");
		});

		it("allows mutation function to throw errors", () => {
			const mutation = storeMutation(soccerSchema, "create", () => {
				throw new Error("Validation failed");
			});

			expect(() => mutation("fields", { name: "Peoria Pier Park" })).toThrow(
				"Validation failed",
			);
		});

		it("allows mutation function to return undefined", () => {
			const mutation = storeMutation(soccerSchema, "delete", () => {
				return undefined;
			});

			const result = mutation({ type: "fields", id: "field-1" });

			expect(result).toBeUndefined();
		});

		it("preserves id when using flat format", () => {
			let receivedResource;
			const mutation = storeMutation(soccerSchema, "update", (normalRes) => {
				receivedResource = normalRes;
				return normalRes;
			});

			mutation("fields", { id: "custom-id", name: "Lake Havasu Pitch" });

			expect(receivedResource.id).toBe("custom-id");
		});
	});

	describe("real-world usage scenarios", () => {
		it("simulates create with validation in mutation function", () => {
			const mutation = storeMutation(soccerSchema, "create", (normalRes) => {
				if (!normalRes.attributes.name) {
					throw new Error("Name is required");
				}
				return { ...normalRes, created: true };
			});

			const result = mutation("teams", {
				name: "Sedona Red Rocks",
				homeField: "field-1",
			});

			expect(result).toHaveProperty("created", true);
			expect(result.attributes).toHaveProperty("name", "Sedona Red Rocks");
		});

		it("simulates update with partial data", () => {
			const mutation = storeMutation(soccerSchema, "update", (normalRes) => {
				return { ...normalRes, updated: true };
			});

			const result = mutation("teams", {
				id: "team-1",
				name: "Prescott Tidal Force",
			});

			expect(result).toHaveProperty("updated", true);
			expect(result).toHaveProperty("id", "team-1");
			expect(result.attributes).toHaveProperty("name", "Prescott Tidal Force");
		});

		it("simulates upsert deciding between create and update", () => {
			const mutation = storeMutation(soccerSchema, "upsert", (normalRes) => {
				const operation = normalRes.id ? "update" : "create";
				return { ...normalRes, operation };
			});

			const createResult = mutation("fields", {
				name: "Sierra Vista Waterfront",
			});
			expect(createResult).toHaveProperty("operation", "create");

			const updateResult = mutation("fields", {
				id: "field-1",
				name: "Bisbee Seascape",
			});
			expect(updateResult).toHaveProperty("operation", "update");
		});

		it("handles complex nested relationships", () => {
			let receivedResource;
			const mutation = storeMutation(soccerSchema, "create", (normalRes) => {
				receivedResource = normalRes;
				return normalRes;
			});

			mutation("games", {
				homeScore: 3,
				awayScore: 2,
				homeTeam: { id: "team-1", name: "Tucson Tsunami" },
				awayTeam: "team-2",
				referee: null,
			});

			expect(receivedResource.relationships.homeTeam).toEqual({
				type: "teams",
				id: "team-1",
			});
			expect(receivedResource.relationships.awayTeam).toEqual({
				type: "teams",
				id: "team-2",
			});
			expect(receivedResource.relationships.referee).toBeNull();
		});

		it("works with async mutation functions", async () => {
			const mutation = storeMutation(
				soccerSchema,
				"create",
				async (normalRes) => {
					// Simulate async operation
					await new Promise((resolve) => setTimeout(resolve, 1));
					return { ...normalRes, asyncProcessed: true };
				},
			);

			const result = await mutation("fields", {
				name: "Nogales Coastline Complex",
			});

			expect(result).toHaveProperty("asyncProcessed", true);
		});
	});
});
