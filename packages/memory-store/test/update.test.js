import { expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { createMemoryStore } from "../src";
import { careBearSchema } from "@data-prism/test-fixtures";

const store = createMemoryStore(careBearSchema);

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

	await store.update({
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

it("fails to update a single resource with a nonexistant ID", async () => {
	const id = randomBytes(20).toString("hex");

	await expect(async () => {
		await store.update({
			type: "bears",
			id,
			attributes: {
				name: "Watchful Bear",
				yearIntroduced: 2019,
				bellyBadge: "star with swirls",
				furColor: "pastel green",
			},
		});
	}).rejects.toThrowError();
});

it("fails to update a single resource with an invalid attribute", async () => {
	const created = await store.create({
		type: "bears",
		attributes: {
			name: "Grumpy Bear",
			yearIntroduced: 1982,
			bellyBadge: "blue storm cloud with raindrops",
			furColor: "blue",
		},
	});

	await expect(async () => {
		await store.update({
			type: "bears",
			id: created.id,
			attributes: {
				bellyBadge: 1999,
			},
		});
	}).rejects.toThrowError();
});

it("updates a single resource with multiple attributes", async () => {
	const created = await store.create({
		type: "bears",
		attributes: {
			name: "Bedtime Bear",
			yearIntroduced: 1984,
			bellyBadge: "white crescent moon with yellow star",
			furColor: "turquoise",
		},
	});

	await store.update({
		type: "bears",
		id: created.id,
		attributes: {
			yearIntroduced: 1985,
			bellyBadge: "white crescent moon with silver star",
		},
	});

	const result = await store.query({
		type: "bears",
		id: created.id,
		select: ["name", "bellyBadge", "yearIntroduced"],
	});

	expect(result).toEqual({
		name: "Bedtime Bear",
		yearIntroduced: 1985,
		bellyBadge: "white crescent moon with silver star",
	});
});

it("updates a single resource with a local relationship", async () => {
	const createdHome = await store.create({
		type: "homes",
		attributes: {
			name: "Joke-a-Lot",
		},
	});

	const created = await store.create({
		type: "bears",
		attributes: {
			name: "Dare to Care Bear",
			yearIntroduced: 2023,
			bellyBadge: "yellow and blue smiling shooting stars",
			furColor: "orange, pink, purple, blue",
		},
	});

	await store.update({
		type: "bears",
		id: created.id,
		relationships: {
			home: { type: "homes", id: createdHome.id },
		},
	});

	const result = await store.query({
		type: "bears",
		id: created.id,
		select: ["name", { home: { select: ["name"] } }],
	});

	expect(result).toEqual({
		name: "Dare to Care Bear",
		home: { name: "Joke-a-Lot" },
	});
});

it("updates a single resource with a local relationship redundantly", async () => {
	const createdHome = await store.create({
		type: "homes",
		attributes: {
			name: "Rainbow Falls",
		},
	});

	const created = await store.create({
		type: "bears",
		attributes: {
			name: "Good Luck Bear",
			yearIntroduced: 1982,
			bellyBadge: "green four-leaf clover",
			furColor: "green",
		},
		relationships: {
			home: { type: "homes", id: createdHome.id },
		},
	});

	await store.update({
		type: "bears",
		id: created.id,
		attributes: { name: "Good Luck Bear" },
	});

	await store.update({
		type: "bears",
		id: created.id,
		relationships: {
			home: { type: "homes", id: createdHome.id },
		},
	});

	const result = await store.query({
		type: "bears",
		id: created.id,
		select: ["name", { home: { select: ["name"] } }],
	});

	expect(result).toEqual({
		name: "Good Luck Bear",
		home: { name: "Rainbow Falls" },
	});
});

it("updates a single resource with a foreign to-one relationship", async () => {
	const createdBear = await store.create({
		type: "bears",
		attributes: {
			name: "Birthday Bear",
			yearIntroduced: 1984,
			bellyBadge: "pink cupcake with candle",
			furColor: "pink",
		},
	});

	const createdHome = await store.create({
		type: "homes",
		attributes: {
			name: "Hall of Hearts",
			caringMeter: 0.95,
			isInClouds: true,
		},
	});

	await store.update({
		type: "homes",
		id: createdHome.id,
		relationships: {
			residents: [{ type: "bears", id: createdBear.id }],
		},
	});

	const homeResult = await store.query({
		type: "homes",
		id: createdHome.id,
		select: ["name", { residents: { select: ["name"] } }],
	});
	expect(homeResult).toEqual({
		name: "Hall of Hearts",
		residents: [{ name: "Birthday Bear" }],
	});

	const bearResult = await store.query({
		type: "bears",
		id: createdBear.id,
		select: ["name", { home: { select: ["name"] } }],
	});
	expect(bearResult).toEqual({
		name: "Birthday Bear",
		home: { name: "Hall of Hearts" },
	});
});

it("removes foreign relationships that are no longer present in the base resource", async () => {
	const createdHome = await store.create({
		type: "homes",
		attributes: {
			name: "Paradise Valley",
			caringMeter: 0.9,
			isInClouds: false,
		},
	});

	const shareBear = await store.create({
		type: "bears",
		attributes: {
			name: "Share Bear",
			yearIntroduced: 1988,
			bellyBadge: "two ice cream sundaes",
			furColor: "lavender",
		},
		relationships: {
			home: { type: "homes", id: createdHome.id },
		},
	});

	await store.create({
		type: "bears",
		attributes: {
			name: "Always There Bear",
			yearIntroduced: 2006,
			bellyBadge: "pink and lavender hearts",
			furColor: "red",
		},
		relationships: {
			home: { type: "homes", id: createdHome.id },
		},
	});

	const homeResult1 = await store.query({
		type: "homes",
		id: createdHome.id,
		select: ["name", { residents: { select: ["name"] } }],
	});
	expect(homeResult1).toEqual({
		name: "Paradise Valley",
		residents: [{ name: "Share Bear" }, { name: "Always There Bear" }],
	});

	const noHeartsCastle = await store.create({
		type: "homes",
		attributes: {
			name: "No Heart's Castle",
			caringMeter: 0,
			isInClouds: true,
		},
	});

	await store.update({
		type: "homes",
		id: noHeartsCastle.id,
		relationships: {
			residents: [{ type: "bears", id: shareBear.id }],
		},
	});

	const homeResult2 = await store.query({
		type: "homes",
		id: createdHome.id,
		select: ["name", { residents: { select: ["name"] } }],
	});
	expect(homeResult2).toEqual({
		name: "Paradise Valley",
		residents: [{ name: "Always There Bear" }],
	});
});

it("updates a single resource with a many-to-many relationship", async () => {
	const createdBear = await store.create({
		type: "bears",
		attributes: {
			name: "Love-a-Lot Bear",
			yearIntroduced: 1982,
			bellyBadge: "two red hearts",
			furColor: "magenta",
		},
	});

	const createdPower = await store.create({
		type: "powers",
		attributes: {
			name: "Care Cousins Call",
			description: "Just like the Care Bear Stare, but with the cousins.",
		},
	});

	await store.update({
		type: "powers",
		id: createdPower.id,
		relationships: {
			wielders: [{ type: "bears", id: createdBear.id }],
		},
	});

	const powerResult = await store.query({
		type: "powers",
		id: createdPower.id,
		select: ["name", { wielders: { select: ["name"] } }],
	});
	expect(powerResult).toEqual({
		name: "Care Cousins Call",
		wielders: [{ name: "Love-a-Lot Bear" }],
	});

	const bearResult = await store.query({
		type: "bears",
		id: createdBear.id,
		select: ["name", { powers: { select: ["name"] } }],
	});
	expect(bearResult).toEqual({
		name: "Love-a-Lot Bear",
		powers: [{ name: "Care Cousins Call" }],
	});
});

it("updates a single resource with a many-to-many relationship with redunant updates", async () => {
	const createdBear = await store.create({
		type: "bears",
		attributes: {
			name: "Friend Bear",
			yearIntroduced: 1982,
			bellyBadge: "two yellow smiling flowers",
			furColor: "orange",
		},
	});

	const createdPower = await store.create({
		type: "powers",
		attributes: {
			name: "Care Cousins Call",
			description: "Just like the Care Bear Stare, but with the cousins.",
		},
	});

	await store.update({
		type: "powers",
		id: createdPower.id,
		relationships: {
			wielders: [{ type: "bears", id: createdBear.id }],
		},
	});

	// redundant
	await store.update({
		type: "powers",
		id: createdPower.id,
		relationships: {
			wielders: [{ type: "bears", id: createdBear.id }],
		},
	});

	const powerResult = await store.query({
		type: "powers",
		id: createdPower.id,
		select: ["name", { wielders: { select: ["name"] } }],
	});
	expect(powerResult).toEqual({
		name: "Care Cousins Call",
		wielders: [{ name: "Friend Bear" }],
	});

	const bearResult = await store.query({
		type: "bears",
		id: createdBear.id,
		select: ["name", { powers: { select: ["name"] } }],
	});
	expect(bearResult).toEqual({
		name: "Friend Bear",
		powers: [{ name: "Care Cousins Call" }],
	});
});

it("keeps many-to-many foreign relationships that belong to a second resource", async () => {
	const createdPower = await store.create({
		type: "powers",
		attributes: {
			name: "Care Cousins Call",
			description: "Just like the Care Bear Stare, but with the cousins.",
		},
	});

	const harmonyBear = await store.create({
		type: "bears",
		attributes: {
			name: "Harmony Bear",
			yearIntroduced: 2007,
			bellyBadge: "rainbow musical note",
			furColor: "lavender",
		},
		relationships: {
			powers: [{ type: "powers", id: createdPower.id }],
		},
	});

	await store.create({
		type: "bears",
		attributes: {
			name: "Always There Bear",
			yearIntroduced: 2006,
			bellyBadge: "pink and lavender hearts",
			furColor: "red",
		},
		relationships: {
			powers: [{ type: "powers", id: createdPower.id }],
		},
	});

	const powerResult1 = await store.query({
		type: "powers",
		id: createdPower.id,
		select: ["name", { wielders: { select: ["name"] } }],
	});
	expect(powerResult1).toEqual({
		name: "Care Cousins Call",
		wielders: [{ name: "Harmony Bear" }, { name: "Always There Bear" }],
	});

	const createdPower2 = await store.create({
		type: "powers",
		attributes: {
			name: "Fly",
		},
	});

	await store.update({
		type: "powers",
		id: createdPower2.id,
		relationships: {
			wielders: [{ type: "bears", id: harmonyBear.id }],
		},
	});

	const powerResult2 = await store.query({
		type: "powers",
		id: createdPower.id,
		select: ["name", { wielders: { select: ["name"] } }],
	});
	expect(powerResult2).toEqual({
		name: "Care Cousins Call",
		wielders: [{ name: "Harmony Bear" }, { name: "Always There Bear" }],
	});
});
