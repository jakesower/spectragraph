import { expect, it } from "vitest";
import { createMemoryStore } from "../src/index.js";
import { careBearSchema } from "@data-prism/test-fixtures";

const store = createMemoryStore(careBearSchema);

it("merges a single resource with only attributes", async () => {
	const merged = await store.merge({
		type: "bears",
		attributes: {
			name: "Bedtime Bear",
			yearIntroduced: 1984,
			bellyBadge: "white crescent moon with yellow star",
			furColor: "turquoise",
		},
	});

	const result = await store.query({
		type: "bears",
		id: merged.id,
		select: ["name"],
	});

	expect(result).toEqual({ name: "Bedtime Bear" });
});

it("updates a single resource with only attributes", async () => {
	const created = await store.create({
		type: "bears",
		attributes: {
			name: "Friend Bear",
			yearIntroduced: 1982,
			bellyBadge: "two yellow smiling flowers",
			furColor: "orange",
		},
	});

	await store.merge({
		type: "bears",
		id: created.id,
		attributes: {
			bellyBadge: "two yellow smiling flowers with hearts",
		},
	});

	const result = await store.query({
		type: "bears",
		id: created.id,
		select: ["name", "bellyBadge"],
	});

	expect(result).toEqual({
		name: "Friend Bear",
		bellyBadge: "two yellow smiling flowers with hearts",
	});
});

it("creates resources in a tree and properly relates them", async () => {
	const merged = await store.merge({
		type: "bears",
		attributes: {
			name: "Care-a-Lot Bear",
			yearIntroduced: 2022,
			bellyBadge: "Care-a-Lot Castle with a rainbow",
			furColor: "purple/pink/light blue",
		},
		relationships: {
			home: {
				type: "homes",
				attributes: {
					name: "Care-a-Lot Castle",
					caringMeter: 1,
				},
			},
		},
	});

	const bearResult = await store.query({
		type: "bears",
		id: merged.id,
		select: ["yearIntroduced", { home: { select: ["name"] } }],
	});

	expect(bearResult).toEqual({
		yearIntroduced: 2022,
		home: { name: "Care-a-Lot Castle" },
	});
});
