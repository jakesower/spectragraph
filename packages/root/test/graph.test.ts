import { expect, it, describe } from "vitest";
import { careBearData } from "./fixtures/care-bear-data.js"; // eslint-disable-line
import { Graph, linkInverses, mergeGraphs } from "../src/graph.js";
import { careBearSchema } from "./fixtures/care-bear-schema.js";
import { mapValues, omit, pick } from "lodash-es";

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

describe("mergeGraphs", () => {
	it("merges graphs with different resource types", () => {
		const left = { bears: careBearData.bears };
		const right = { homes: careBearData.homes };

		const merged = mergeGraphs(left, right);

		expect(merged).toEqual(pick(careBearData, ["bears", "homes"]));
	});

	it("merges graphs with resources of the same type", () => {
		const left = { bears: pick(careBearData.bears, ["1"]) } as Graph;
		const right = { bears: omit(careBearData.bears, ["1"]) } as Graph;

		const merged = mergeGraphs(left, right);

		expect(merged).toEqual(pick(careBearData, ["bears"]));
	});

	it("merges graphs with a mix of things", () => {
		const left = {
			bears: pick(careBearData.bears, ["1"]),
			powers: careBearData.powers,
			companions: careBearData.companions,
		} as Graph;

		const right = {
			bears: omit(careBearData.bears, ["1"]),
			homes: careBearData.homes,
		} as Graph;

		const merged = mergeGraphs(left, right);

		expect(merged).toEqual(careBearData);
	});
});
