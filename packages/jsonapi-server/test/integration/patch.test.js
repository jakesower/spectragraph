import { expect, it } from "vitest";
import { api } from "../helpers.js";

it("updates a single resource with only attributes", async () => {
	const created = await api.post("/bears", {
		data: {
			type: "bears",
			attributes: {
				name: "Champ Bear",
				yearIntroduced: 1984,
				bellyBadge: "yellow trophy with red heart stamp",
				furColor: "cerulean",
			},
		},
	});

	await api.patch(`/bears/${created.data.id}`, {
		data: {
			type: "bears",
			id: created.data.id,
			attributes: {
				bellyBadge: "yellow trophy with red star stamp",
			},
		},
	});

	const result = await api.get(
		`/bears/${created.data.id}?fields[bears]=name,bellyBadge`,
	);
	expect(result).toEqual({
		data: {
			type: "bears",
			id: created.data.id,
			attributes: {
				name: "Champ Bear",
				bellyBadge: "yellow trophy with red star stamp",
			},
			relationships: {},
		},
	});

	await api.delete(`/bears/${created.data.id}`);
});

it("updates a single resource with multiple attributes", async () => {
	const created = await api.post("/bears", {
		data: {
			type: "bears",
			attributes: {
				name: "Champ Bear",
				yearIntroduced: 1984,
				bellyBadge: "yellow trophy with red heart stamp",
				furColor: "cerulean",
			},
		},
	});

	await api.patch(`/bears/${created.data.id}`, {
		data: {
			type: "bears",
			id: created.data.id,
			attributes: {
				yearIntroduced: 1985,
				bellyBadge: "yellow trophy with red star stamp",
			},
		},
	});

	const result = await api.get(
		`/bears/${created.data.id}?fields[bears]=name,bellyBadge,yearIntroduced`,
	);
	expect(result).toEqual({
		data: {
			type: "bears",
			id: created.data.id,
			attributes: {
				name: "Champ Bear",
				bellyBadge: "yellow trophy with red star stamp",
				yearIntroduced: 1985,
			},
			relationships: {},
		},
	});

	await api.delete(`/bears/${created.data.id}`);
});

it("updates a single resource with a local relationship", async () => {
	const createdHome = await api.post("/homes", {
		data: {
			type: "homes",
			attributes: {
				name: "Joke-a-Lot",
			},
		},
	});

	const created = await api.post("/bears", {
		data: {
			type: "bears",
			attributes: {
				name: "Dare to Care Bear",
				yearIntroduced: 2023,
				bellyBadge: "yellow and blue smiling shooting stars",
				furColor: "orange, pink, purple, blue",
			},
		},
	});

	await api.patch(`/bears/${created.data.id}`, {
		data: {
			type: "bears",
			id: created.data.id,
			relationships: {
				home: { data: { type: "homes", id: createdHome.data.id } },
			},
		},
	});

	const result = await api.get(
		`/bears/${created.data.id}?fields[bears]=name&fields[homes]=name&include=home`,
	);

	expect(result).toEqual({
		data: {
			type: "bears",
			id: created.data.id,
			attributes: {
				name: "Dare to Care Bear",
			},
			relationships: {
				home: { data: { type: "homes", id: createdHome.data.id } },
			},
		},
		included: [
			{
				type: "homes",
				id: createdHome.data.id,
				attributes: {
					name: "Joke-a-Lot",
				},
				relationships: {},
			},
		],
	});

	await api.delete(`/bears/${created.data.id}`);
	await api.delete(`/homes/${createdHome.data.id}`);
});

it("updates a single resource with a local relationship redundantly", async () => {
	const createdHome = await api.post("/homes", {
		data: {
			type: "homes",
			attributes: {
				name: "Joke-a-Lot",
			},
		},
	});

	const createdBear = await api.post("/bears", {
		data: {
			type: "bears",
			attributes: {
				name: "Dare to Care Bear",
				yearIntroduced: 2023,
				bellyBadge: "yellow and blue smiling shooting stars",
				furColor: "orange, pink, purple, blue",
			},
			relationships: {
				home: { data: { type: "homes", id: createdHome.data.id } },
			},
		},
	});

	await api.patch(`/bears/${createdBear.data.id}`, {
		data: {
			type: "bears",
			id: createdBear.data.id,
			relationships: {
				home: { data: { type: "homes", id: createdHome.data.id } },
			},
		},
	});

	const result = await api.get(
		`/bears/${createdBear.data.id}?fields[homes]=name&fields[bears]=name&include=home`,
	);

	expect(result).toEqual({
		data: {
			type: "bears",
			id: createdBear.data.id,
			attributes: {
				name: "Dare to Care Bear",
			},
			relationships: {
				home: { data: { type: "homes", id: createdHome.data.id } },
			},
		},
		included: [
			{
				type: "homes",
				id: createdHome.data.id,
				attributes: {
					name: "Joke-a-Lot",
				},
				relationships: {},
			},
		],
	});

	await api.delete(`/bears/${createdBear.data.id}`);
	await api.delete(`/homes/${createdHome.data.id}`);
});

it("updates a single resource with a foreign to-one relationship", async () => {
	const createdBear = await api.post("/bears", {
		data: {
			type: "bears",
			attributes: {
				name: "Funshine Bear",
				yearIntroduced: 1982,
				bellyBadge: "yellow smiling sun",
				furColor: "golden yellow",
			},
		},
	});

	const createdHome = await api.post("/homes", {
		data: {
			type: "homes",
			attributes: {
				name: "Hall of Hearts",
			},
		},
	});

	await api.patch(`/homes/${createdHome.data.id}`, {
		data: {
			type: "homes",
			id: createdHome.data.id,
			relationships: {
				residents: { data: [{ type: "bears", id: createdBear.data.id }] },
			},
		},
	});

	const homeResult = await api.get(
		`/homes/${createdHome.data.id}?fields[homes]=name&fields[bears]=name&include=residents`,
	);
	expect(homeResult).toEqual({
		data: {
			type: "homes",
			id: createdHome.data.id,
			attributes: {
				name: "Hall of Hearts",
			},
			relationships: {
				residents: { data: [{ type: "bears", id: createdBear.data.id }] },
			},
		},
		included: [
			{
				type: "bears",
				id: createdBear.data.id,
				attributes: { name: "Funshine Bear" },
				relationships: {},
			},
		],
	});

	const bearResult = await api.get(
		`/bears/${createdBear.data.id}?fields[homes]=name&fields[bears]=name&include=home`,
	);
	expect(bearResult).toEqual({
		data: {
			type: "bears",
			id: createdBear.data.id,
			attributes: { name: "Funshine Bear" },
			relationships: {
				home: { data: { type: "homes", id: createdHome.data.id } },
			},
		},
		included: [
			{
				type: "homes",
				id: createdHome.data.id,
				attributes: {
					name: "Hall of Hearts",
				},
				relationships: {},
			},
		],
	});

	await api.delete(`/bears/${createdBear.data.id}`);
	await api.delete(`/homes/${createdHome.data.id}`);
});

it("removes foreign relationships that are no longer present in the base resource", async () => {
	const createdHome = await api.post("/homes", {
		data: {
			type: "homes",
			attributes: {
				name: "Paradise Valley",
				location: "Earth",
				caringMeter: 0.9,
				isInClouds: false,
			},
		},
	});

	const oopsyBear = await api.post("/bears", {
		data: {
			type: "bears",
			attributes: {
				name: "Oopsy Bear",
				yearIntroduced: 2007,
				bellyBadge: "varied drawings",
				furColor: "light green",
			},
			relationships: {
				home: { data: { type: "homes", id: createdHome.data.id } },
			},
		},
	});

	const alwaysThereBear = await api.post("/bears", {
		data: {
			type: "bears",
			attributes: {
				name: "Always There Bear",
				yearIntroduced: 2006,
				bellyBadge: "pink and lavender hearts",
				furColor: "red",
			},
			relationships: {
				home: { data: { type: "homes", id: createdHome.data.id } },
			},
		},
	});

	const homeResult1 = await api.get(
		`/homes/${createdHome.data.id}?fields[homes]=name&fields[bears]=name&include=residents`,
	);
	expect(homeResult1).toEqual({
		data: {
			type: "homes",
			id: createdHome.data.id,
			attributes: {
				name: "Paradise Valley",
			},
			relationships: {
				residents: {
					data: [
						{ type: "bears", id: oopsyBear.data.id },
						{ type: "bears", id: alwaysThereBear.data.id },
					],
				},
			},
		},
		included: [
			{
				type: "bears",
				id: oopsyBear.data.id,
				attributes: { name: "Oopsy Bear" },
				relationships: {},
			},
			{
				type: "bears",
				id: alwaysThereBear.data.id,
				attributes: { name: "Always There Bear" },
				relationships: {},
			},
		],
	});

	const noHeartsCastle = await api.post("/homes", {
		data: {
			type: "homes",
			attributes: {
				name: "No Heart's Castle",
				location: "Gloomy Gulch Trail",
				caringMeter: 0,
				isInClouds: true,
			},
			relationships: {
				residents: { data: [{ type: "bears", id: oopsyBear.data.id }] },
			},
		},
	});

	await api.patch(`/homes/${noHeartsCastle.data.id}`, {
		data: {
			type: "homes",
			id: noHeartsCastle.data.id,
			relationships: {
				residents: { data: [{ type: "bears", id: oopsyBear.data.id }] },
			},
		},
	});

	const homeResult2 = await api.get(
		`/homes/${createdHome.data.id}?fields[homes]=name&fields[bears]=name&include=residents`,
	);
	expect(homeResult2).toEqual({
		data: {
			type: "homes",
			id: createdHome.data.id,
			attributes: {
				name: "Paradise Valley",
			},
			relationships: {
				residents: {
					data: [{ type: "bears", id: alwaysThereBear.data.id }],
				},
			},
		},
		included: [
			{
				type: "bears",
				id: alwaysThereBear.data.id,
				attributes: { name: "Always There Bear" },
				relationships: {},
			},
		],
	});

	await api.delete(`/bears/${oopsyBear.data.id}`);
	await api.delete(`/bears/${alwaysThereBear.data.id}`);
	await api.delete(`/homes/${createdHome.data.id}`);
});

it("updates a single resource with a many-to-many relationship", async () => {
	const secretBear = await api.post("/bears", {
		data: {
			type: "bears",
			attributes: {
				name: "Secret Bear",
				yearIntroduced: 1985,
				bellyBadge: "red heart-shaped padlock",
				furColor: "magenta",
			},
		},
	});

	const createdPower = await api.post("/powers", {
		data: {
			type: "powers",
			attributes: {
				name: "Care Cousins Call",
				description: "Just like the Care Bear Stare, but with the cousins.",
			},
		},
	});

	await api.patch(`/powers/${createdPower.data.id}`, {
		data: {
			type: "powers",
			id: createdPower.data.id,
			relationships: {
				wielders: { data: [{ type: "bears", id: secretBear.data.id }] },
			},
		},
	});

	const powerResult = await api.get(
		`/powers/${createdPower.data.id}?fields[powers]=name&fields[bears]=name&include=wielders`,
	);
	expect(powerResult).toEqual({
		data: {
			type: "powers",
			id: createdPower.data.id,
			attributes: {
				name: "Care Cousins Call",
			},
			relationships: {
				wielders: { data: [{ type: "bears", id: secretBear.data.id }] },
			},
		},
		included: [
			{
				type: "bears",
				id: secretBear.data.id,
				attributes: {
					name: "Secret Bear",
				},
				relationships: {},
			},
		],
	});

	const bearResult = await api.get(
		`/bears/${secretBear.data.id}?fields[powers]=name&fields[bears]=name&include=powers`,
	);
	expect(bearResult).toEqual({
		data: {
			type: "bears",
			id: secretBear.data.id,
			attributes: {
				name: "Secret Bear",
			},
			relationships: {
				powers: { data: [{ type: "powers", id: createdPower.data.id }] },
			},
		},

		included: [
			{
				type: "powers",
				id: createdPower.data.id,
				attributes: {
					name: "Care Cousins Call",
				},
				relationships: {},
			},
		],
	});

	await api.delete(`/bears/${secretBear.data.id}`);
	await api.delete(`/powers/${createdPower.data.id}`);
});

it("updates a single resource with a many-to-many relationship with redunant updates", async () => {
	const secretBear = await api.post("/bears", {
		data: {
			type: "bears",
			attributes: {
				name: "Secret Bear",
				yearIntroduced: 1985,
				bellyBadge: "red heart-shaped padlock",
				furColor: "magenta",
			},
		},
	});

	const createdPower = await api.post("/powers", {
		data: {
			type: "powers",
			attributes: {
				name: "Care Cousins Call",
				description: "Just like the Care Bear Stare, but with the cousins.",
			},
		},
	});

	await api.patch(`/powers/${createdPower.data.id}`, {
		data: {
			type: "powers",
			id: createdPower.data.id,
			relationships: {
				wielders: { data: [{ type: "bears", id: secretBear.data.id }] },
			},
		},
	});

	await api.patch(`/powers/${createdPower.data.id}`, {
		data: {
			type: "powers",
			id: createdPower.data.id,
			relationships: {
				wielders: { data: [{ type: "bears", id: secretBear.data.id }] },
			},
		},
	});

	const powerResult = await api.get(
		`/powers/${createdPower.data.id}?fields[powers]=name&fields[bears]=name&include=wielders`,
	);
	expect(powerResult).toEqual({
		data: {
			type: "powers",
			id: createdPower.data.id,
			attributes: {
				name: "Care Cousins Call",
			},
			relationships: {
				wielders: { data: [{ type: "bears", id: secretBear.data.id }] },
			},
		},
		included: [
			{
				type: "bears",
				id: secretBear.data.id,
				attributes: {
					name: "Secret Bear",
				},
				relationships: {},
			},
		],
	});

	const bearResult = await api.get(
		`/bears/${secretBear.data.id}?fields[powers]=name&fields[bears]=name&include=powers`,
	);
	expect(bearResult).toEqual({
		data: {
			type: "bears",
			id: secretBear.data.id,
			attributes: {
				name: "Secret Bear",
			},
			relationships: {
				powers: { data: [{ type: "powers", id: createdPower.data.id }] },
			},
		},

		included: [
			{
				type: "powers",
				id: createdPower.data.id,
				attributes: {
					name: "Care Cousins Call",
				},
				relationships: {},
			},
		],
	});

	await api.delete(`/bears/${secretBear.data.id}`);
	await api.delete(`/powers/${createdPower.data.id}`);
});

it("keeps many-to-many foreign relationships that belong to a second resource", async () => {
	const createdPower = await api.post("/powers", {
		data: {
			type: "powers",
			attributes: {
				name: "Care Cousins Call",
				description: "Just like the Care Bear Stare, but with the cousins.",
			},
		},
	});

	const oopsyBear = await api.post("/bears", {
		data: {
			type: "bears",
			attributes: {
				name: "Oopsy Bear",
				yearIntroduced: 2007,
				bellyBadge: "varied drawings",
				furColor: "light green",
			},
			relationships: {
				powers: { data: [{ type: "powers", id: createdPower.data.id }] },
			},
		},
	});

	const alwaysThereBear = await api.post("/bears", {
		data: {
			type: "bears",
			attributes: {
				name: "Always There Bear",
				yearIntroduced: 2006,
				bellyBadge: "pink and lavender hearts",
				furColor: "red",
			},
			relationships: {
				powers: { data: [{ type: "powers", id: createdPower.data.id }] },
			},
		},
	});

	const powerResult = await api.get(
		`/powers/${createdPower.data.id}?fields[powers]=name&fields[bears]=name&include=wielders`,
	);
	expect(powerResult).toEqual({
		data: {
			type: "powers",
			id: createdPower.data.id,
			attributes: {
				name: "Care Cousins Call",
			},
			relationships: {
				wielders: {
					data: [
						{ type: "bears", id: oopsyBear.data.id },
						{ type: "bears", id: alwaysThereBear.data.id },
					],
				},
			},
		},
		included: [
			{
				type: "bears",
				id: oopsyBear.data.id,
				attributes: {
					name: "Oopsy Bear",
				},
				relationships: {},
			},
			{
				type: "bears",
				id: alwaysThereBear.data.id,
				attributes: {
					name: "Always There Bear",
				},
				relationships: {},
			},
		],
	});

	const createdPower2 = await api.post("/powers", {
		data: {
			type: "powers",
			attributes: {
				name: "Fly",
			},
		},
	});

	await api.patch(`/powers/${createdPower2.data.id}`, {
		data: {
			type: "powers",
			id: createdPower2.data.id,
			relationships: {
				wielders: { data: [{ type: "bears", id: oopsyBear.data.id }] },
			},
		},
	});

	const powerResult2 = await api.get(
		`/powers/${createdPower.data.id}?fields[powers]=name&fields[bears]=name&include=wielders`,
	);
	expect(powerResult2).toEqual({
		data: {
			type: "powers",
			id: createdPower.data.id,
			attributes: {
				name: "Care Cousins Call",
			},
			relationships: {
				wielders: {
					data: [
						{ type: "bears", id: oopsyBear.data.id },
						{ type: "bears", id: alwaysThereBear.data.id },
					],
				},
			},
		},
		included: [
			{
				type: "bears",
				id: oopsyBear.data.id,
				attributes: {
					name: "Oopsy Bear",
				},
				relationships: {},
			},
			{
				type: "bears",
				id: alwaysThereBear.data.id,
				attributes: {
					name: "Always There Bear",
				},
				relationships: {},
			},
		],
	});

	await api.delete(`/bears/${oopsyBear.data.id}`);
	await api.delete(`/bears/${alwaysThereBear.data.id}`);
	await api.delete(`/powers/${createdPower.data.id}`);
	await api.delete(`/powers/${createdPower2.data.id}`);
});
