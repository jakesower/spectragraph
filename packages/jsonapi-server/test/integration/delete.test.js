import { expect, it } from "vitest";
import { api } from "../helpers.js";

it("deletes a single resource", async () => {
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

	await api.delete(`/bears/${created.data.id}`);

	const result = await api.get(
		`/bears/${created.data.id}?fields[bears]=name,bellyBadge`,
	);

	expect(result).toEqual({ data: null });
});

it("deletes a single resource with a local relationship", async () => {
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

	await api.delete(`/bears/${created.data.id}`);

	const result = await api.get(
		`/bears/${created.data.id}?fields[bears]=name&fields[homes]=name&include=home`,
	);
	expect(result).toEqual({ data: null });

	const result2 = await api.get(
		`/homes/${createdHome.data.id}?fields[bears]=name&fields[homes]=name&include=residents`,
	);
	expect(result2).toEqual({
		data: {
			type: "homes",
			id: createdHome.data.id,
			attributes: {
				name: "Joke-a-Lot",
			},
			relationships: {
				residents: { data: [] },
			},
		},
	});
});

it("deletes a single resource with a foreign to-one relationship", async () => {
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
				location: "Hall of Hearts",
				caringMeter: 0.95,
				isInClouds: true,
			},
			relationships: {
				residents: { data: [{ type: "bears", id: createdBear.data.id }] },
			},
		},
	});

	await api.delete(`/bears/${createdBear.data.id}`);

	const homeResult = await api.get(
		`/homes/${createdHome.data.id}?fields[bears]=name&fields[homes]=name&include=residents`,
	);
	expect(homeResult).toEqual({
		data: {
			type: "homes",
			id: createdHome.data.id,
			attributes: {
				name: "Hall of Hearts",
			},
			relationships: {
				residents: { data: [] },
			},
		},
	});

	const result = await api.get(
		`/bears/${createdBear.data.id}?fields[bears]=name&fields[homes]=name&include=home`,
	);
	expect(result).toEqual({ data: null });
});

it("deletes all many-to-many foreign relationships that belong to a deleted resource", async () => {
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
			wielders: { data: [{ type: "bears", id: oopsyBear.data.id }] },
		},
	});

	await api.delete(`/bears/${oopsyBear.data.id}`);

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
					data: [{ type: "bears", id: alwaysThereBear.data.id }],
				},
			},
		},
		included: [
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

	const powerResult3 = await api.get(
		`/powers/${createdPower2.data.id}?fields[powers]=name&fields[bears]=name&include=wielders`,
	);
	expect(powerResult3).toEqual({
		data: {
			type: "powers",
			id: createdPower2.data.id,
			attributes: {
				name: "Fly",
			},
			relationships: { wielders: { data: [] } },
		},
	});
});
