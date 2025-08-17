import { expect, it } from "vitest";
import { createMemoryStore } from "../src/index.js";
import { careBearSchema } from "@data-prism/test-fixtures";

const store = createMemoryStore(careBearSchema);

it("splices a single resource with only attributes", async () => {
	const spliced = await store.splice({
		type: "bears",
		attributes: {
			name: "Champ Bear",
			yearIntroduced: 1984,
			bellyBadge: "yellow trophy with red star",
			furColor: "cerulean",
		},
	});

	const result = await store.query({
		type: "bears",
		id: spliced.id,
		select: ["name"],
	});

	expect(result).toEqual({ name: "Champ Bear" });
});

it("updates a single resource with only attributes", async () => {
	const created = await store.create({
		type: "bears",
		attributes: {
			name: "Champ Bear",
			yearIntroduced: 1984,
			bellyBadge: "yellow trophy with red heart stamp",
			furColor: "cerulean",
		},
	});

	await store.splice({
		type: "bears",
		id: created.id,
		attributes: {
			bellyBadge: "yellow trophy with red star stamp",
		},
	});

	const result = await store.query({
		type: "bears",
		id: created.id,
		select: ["name", "bellyBadge"],
	});

	expect(result).toEqual({
		name: "Champ Bear",
		bellyBadge: "yellow trophy with red star stamp",
	});
});

it("creates resources in a tree and properly relates them", async () => {
	const spliced = await store.splice({
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

	const bearResult = store.query({
		type: "bears",
		id: spliced.id,
		select: ["yearIntroduced", { home: { select: ["name"] } }],
	});

	expect(bearResult).toEqual({
		yearIntroduced: 2022,
		home: { name: "Care-a-Lot Castle" },
	});
});
