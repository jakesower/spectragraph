import { expect, it } from "vitest";
import careBearSchema from "./fixtures/care-bears.schema.json";
import { formatRequest } from "../../jsonapi-server/src/format-request";

const config = { baseURL: "https://example.lol" };

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

	expect(request).toStrictEqual(
		"https://example.lol/homes/1?fields[homes]=id,caringMeter&fields[bears]=id,name&include=residents",
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

	expect(request).toStrictEqual(
		"https://example.lol/homes/1?fields[homes]=id,caringMeter&fields[bears]=id,name&fields[powers]=name&include=residents,residents.powers",
	);
});

it("provides correct fields in relationships with the same type", () => {
	const query = {
		type: "bears",
		select: ["id", { bestFriend: { select: ["name"] } }],
	};

	const request = formatRequest(careBearSchema, config, query);

	expect(request).toStrictEqual(
		"https://example.lol/bears?fields[bears]=id,name&include=bestFriend",
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

	expect(request).toStrictEqual(
		"https://example.lol/homes?fields[homes]=name&fields[bears]=bellyBadge&include=residents&filter[residents.yearIntroduced][$gt]=2000",
	);
});
