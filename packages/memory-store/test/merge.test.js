import { expect, it } from "vitest";
import { createMemoryStore } from "../src/index.js";
import { careBearSchema } from "../../interface-tests/src/index.js";

const store = createMemoryStore(careBearSchema);

it("merges a single resource with only attributes", async () => {
	const bedtimeBear = await store.merge({
		type: "bears",
		attributes: {
			name: "Bedtime Bear",
			yearIntroduced: 1984,
			bellyBadge: "white crescent moon with yellow star",
			furColor: "turquoise",
		},
	});

	const bedtimeBearResult = await store.query({
		type: "bears",
		id: bedtimeBear.id,
		select: ["name"],
	});

	expect(bedtimeBearResult).toEqual({ name: "Bedtime Bear" });
});

it("updates a single resource with only attributes", async () => {
	const friendBear = await store.create({
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
		id: friendBear.id,
		attributes: {
			bellyBadge: "two yellow smiling flowers with hearts",
		},
	});

	const friendBearResult = await store.query({
		type: "bears",
		id: friendBear.id,
		select: ["name", "bellyBadge"],
	});

	expect(friendBearResult).toEqual({
		name: "Friend Bear",
		bellyBadge: "two yellow smiling flowers with hearts",
	});
});

it("updates a single resource with attributes and relationships", async () => {
	const careALot = await store.create({
		type: "homes",
		attributes: {
			name: "Care-a-Lot",
		},
	});

	const cloudForest = await store.create({
		type: "homes",
		attributes: {
			name: "Cloud Forest",
		},
	});

	const friendBear = await store.create({
		type: "bears",
		attributes: {
			name: "Friend Bear",
			yearIntroduced: 1982,
			bellyBadge: "two yellow smiling flowers",
			furColor: "orange",
		},
		relationships: { home: { type: "homes", id: careALot.id } },
	});

	const careALotBefore = await store.query({
		type: "homes",
		id: careALot.id,
		select: ["name", { residents: { select: ["name"] } }],
	});

	expect(careALotBefore).toEqual({
		name: "Care-a-Lot",
		residents: [{ name: "Friend Bear" }],
	});

	await store.merge({
		type: "bears",
		id: friendBear.id,
		attributes: {
			bellyBadge: "two yellow smiling flowers with hearts",
		},
		relationships: { home: { type: "homes", id: cloudForest.id } },
	});

	const friendBearAfter = await store.query({
		type: "bears",
		id: friendBear.id,
		select: ["name", "bellyBadge", { home: { select: ["name"] } }],
	});

	expect(friendBearAfter).toEqual({
		name: "Friend Bear",
		bellyBadge: "two yellow smiling flowers with hearts",
		home: { name: "Cloud Forest" },
	});

	const careALotAfter = await store.query({
		type: "homes",
		id: careALot.id,
		select: ["name", { residents: { select: ["name"] } }],
	});

	expect(careALotAfter).toEqual({ name: "Care-a-Lot", residents: [] });
});

it("creates resources in a tree and properly relates them", async () => {
	const careALotBear = await store.merge({
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

	const careALotBearResult = await store.query({
		type: "bears",
		id: careALotBear.id,
		select: ["yearIntroduced", { home: { select: ["name"] } }],
	});

	expect(careALotBearResult).toEqual({
		yearIntroduced: 2022,
		home: { name: "Care-a-Lot Castle" },
	});
});

it("fails to create a resource with a nonexistant ref", async () => {
	await expect(async () => {
		await store.merge({
			type: "bears",
			attributes: {
				name: "Care-a-Lot Bear",
				yearIntroduced: 2022,
				bellyBadge: "Care-a-Lot Castle with a rainbow",
				furColor: "purple/pink/light blue",
			},
			relationships: {
				home: { type: "homes", id: "uh oh" },
			},
		});
	}).rejects.toThrow();
});
