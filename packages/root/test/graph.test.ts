import { expect, it, describe } from "vitest";
import { careBearData } from "./fixtures/care-bear-data.js"; // eslint-disable-line
import { linkInverses } from "../src/graph.js";
import { careBearSchema } from "./fixtures/care-bear-schema.js";
import { mapValues, omit } from "lodash-es";

describe("linkInverses", () => {
	it("doesn't change anything for an already linked graph", () => {
		const linked = linkInverses(careBearData, careBearSchema);

		expect(linked).toEqual(careBearData);
	});

	it("links a one-to-many relationship", () => {
		const unlinkedBears = mapValues(careBearData.bears, (bear) => ({
			...bear,
			relationships: omit(bear.relationships, ["home"]),
		}));

		const linked = linkInverses(
			{ ...careBearData, bears: unlinkedBears },
			careBearSchema,
		);

		expect(linked).toEqual(careBearData);
	});

	it("links a many-to-one relationship", () => {
		const unlinkedHomes = mapValues(careBearData.homes, (home) => ({
			...home,
			relationships: omit(home.relationships, ["residents"]),
		}));

		const linked = linkInverses(
			{ ...careBearData, homes: unlinkedHomes },
			careBearSchema,
		);

		expect(linked).toEqual(careBearData);
	});

	it("links a many-to-many relationship", () => {
		const unlinkedBears = mapValues(careBearData.bears, (bear) => ({
			...bear,
			relationships: omit(bear.relationships, ["powers"]),
		}));

		const linked = linkInverses(
			{ ...careBearData, bears: unlinkedBears },
			careBearSchema,
		);

		expect(linked).toEqual(careBearData);
	});
});
