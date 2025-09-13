import { expect, it } from "vitest";
import { careBearSchema } from "@spectragraph/interface-tests/fixtures";
import { formatRequest } from "../../src/format-request";

const config = { baseURL: "https://example.lol" };

// Helper function to compare URLs by parsing their parameters
function expectUrlsToBeEquivalent(actual, expected) {
	const parseUrl = (url) => {
		const [baseAndPath, queryString] = url.split("?");
		const params = new URLSearchParams(queryString || "");
		const paramsObj = {};
		for (const [key, value] of params) {
			// For parameters that are comma-separated lists, sort them for comparison
			if (key.startsWith("fields[") || key === "include") {
				paramsObj[key] = value.split(",").sort().join(",");
			} else {
				paramsObj[key] = value;
			}
		}
		return { baseAndPath, params: paramsObj };
	};

	const actualParsed = parseUrl(actual);
	const expectedParsed = parseUrl(expected);

	// Compare base URL and path
	expect(actualParsed.baseAndPath).toBe(expectedParsed.baseAndPath);
	
	// Compare parameters (order independent)
	expect(actualParsed.params).toEqual(expectedParsed.params);
}

it("formats a request for a multiple resource query", () => {
	const query = { type: "bears", select: ["id", "name"] };
	const request = formatRequest(careBearSchema, config, query);

	expect(request).toStrictEqual(
		"https://example.lol/bears?fields[bears]=id,name",
	);
});

it("formats a request for a single resource query", () => {
	const query = { type: "bears", id: "1", select: ["id", "name"] };
	const request = formatRequest(careBearSchema, config, query);

	expect(request).toStrictEqual(
		"https://example.lol/bears/1?fields[bears]=id,name",
	);
});

it("formats a request for a subquery", () => {
	const query = {
		type: "homes",
		id: "1",
		select: ["id", "caringMeter", { residents: { select: ["id", "name"] } }],
	};

	const request = formatRequest(careBearSchema, config, query);

	expectUrlsToBeEquivalent(
		request,
		"https://example.lol/homes/1?fields[bears]=id,name&fields[homes]=id,caringMeter&include=residents",
	);
});

it("formats a request for a nested subquery", () => {
	const query = {
		type: "homes",
		id: "1",
		select: [
			"id",
			"caringMeter",
			{
				residents: {
					select: ["id", "name", { powers: { select: ["name"] } }],
				},
			},
		],
	};

	const request = formatRequest(careBearSchema, config, query);

	expectUrlsToBeEquivalent(
		request,
		"https://example.lol/homes/1?fields[powers]=name&fields[bears]=id,name&fields[homes]=id,caringMeter&include=residents.powers,residents",
	);
});

it("provides correct fields in relationships with the same type", () => {
	const query = {
		type: "bears",
		select: ["id", { bestFriend: { select: ["name"] } }],
	};

	const request = formatRequest(careBearSchema, config, query);

	expectUrlsToBeEquivalent(
		request,
		"https://example.lol/bears?fields[bears]=name,id&include=bestFriend",
	);
});

it("sorts a single ascending field", () => {
	const query = {
		type: "bears",
		select: ["id", "name"],
		order: { name: "asc" },
	};

	const request = formatRequest(careBearSchema, config, query);

	expect(request).toStrictEqual(
		"https://example.lol/bears?fields[bears]=id,name&sort=name",
	);
});

it("sorts a single descending field", () => {
	const query = {
		type: "bears",
		select: ["id", "name"],
		order: { name: "desc" },
	};

	const request = formatRequest(careBearSchema, config, query);

	expect(request).toStrictEqual(
		"https://example.lol/bears?fields[bears]=id,name&sort=-name",
	);
});

it("sorts on multiple fields", () => {
	const query = {
		type: "bears",
		select: ["id", "name", "bellyBadge"],
		order: [{ name: "desc" }, { bellyBadge: "asc" }],
	};

	const request = formatRequest(careBearSchema, config, query);

	expect(request).toStrictEqual(
		"https://example.lol/bears?fields[bears]=id,name,bellyBadge&sort=-name,bellyBadge",
	);
});

it("limits", () => {
	const query = {
		type: "bears",
		select: ["id", "name"],
		limit: 5,
	};

	const request = formatRequest(careBearSchema, config, query);

	expect(request).toStrictEqual(
		"https://example.lol/bears?fields[bears]=id,name&page[number]=1&page[size]=5",
	);
});

it("limits and offsets", () => {
	const query = {
		type: "bears",
		select: ["id", "name"],
		limit: 5,
		offset: 15,
	};

	const request = formatRequest(careBearSchema, config, query);

	expect(request).toStrictEqual(
		"https://example.lol/bears?fields[bears]=id,name&page[number]=4&page[size]=5",
	);
});

it("filters on equality for a single field", () => {
	const query = {
		type: "bears",
		select: ["name"],
		where: { bellyBadge: "heart" },
	};

	const request = formatRequest(careBearSchema, config, query);

	expect(request).toStrictEqual(
		"https://example.lol/bears?fields[bears]=name&filter[bellyBadge]=heart",
	);
});

it("filters on equality for multiple fields", () => {
	const query = {
		type: "bears",
		select: ["name"],
		where: { bellyBadge: "heart", yearIntroduced: 1984 },
	};

	const request = formatRequest(careBearSchema, config, query);

	expect(request).toStrictEqual(
		"https://example.lol/bears?fields[bears]=name&filter[bellyBadge]=heart&filter[yearIntroduced]=1984",
	);
});

it("filters on an expression", () => {
	const query = {
		type: "bears",
		select: ["name"],
		where: { yearIntroduced: { $gt: 2000 } },
	};

	const request = formatRequest(careBearSchema, config, query);

	expect(request).toStrictEqual(
		"https://example.lol/bears?fields[bears]=name&filter[yearIntroduced][$gt]=2000",
	);
});

it("filters on a nested field", () => {
	const query = {
		type: "homes",
		select: [
			"name",
			{
				residents: {
					select: ["bellyBadge"],
					where: { yearIntroduced: { $gt: 2000 } },
				},
			},
		],
	};

	const request = formatRequest(careBearSchema, config, query);

	expectUrlsToBeEquivalent(
		request,
		"https://example.lol/homes?fields[bears]=bellyBadge&fields[homes]=name&include=residents&filter[residents.yearIntroduced][$gt]=2000",
	);
});
