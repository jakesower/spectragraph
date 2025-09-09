import { expect, it, describe } from "vitest";
import {
	extractQueryParameters,
	buildQueryURL,
	jsonApiFormatter,
	restApiFormatter,
	oDataFormatter,
	extractWhereApi,
	extractWhereGraphql,
	createSimpleWhereExtractor,
} from "../src/query-formatters.js";
import skepticismSchema from "./fixtures/skepticism.schema.json";

describe("extractWhere", () => {
	it("builds a simple equality extractor", () => {
		const result = extractWhereApi({ $pipe: [{ $get: "age" }, { $eq: 11 }] });
		expect(result).toEqual("age=11");
	});

	it("builds a simple less than extractor", () => {
		const result = extractWhereApi({ $pipe: [{ $get: "age" }, { $lt: 11 }] });
		expect(result).toEqual("age[$lt]=11");
	});

	it("builds an extractor using $and 1", () => {
		const result = extractWhereApi({
			$and: [
				{ $pipe: [{ $get: "name" }, { $eq: "Priya" }] },
				{ $pipe: [{ $get: "age" }, { $lt: 11 }] },
			],
		});
		expect(result).toEqual("name=Priya&age[$lt]=11");
	});

	it("builds a simple equality extractor gql", () => {
		const result = extractWhereGraphql({
			$pipe: [{ $get: "age" }, { $eq: 11 }],
		});
		expect(result).toEqual("(age: 11)");
	});

	it("builds a simple less than extractor", () => {
		const result = extractWhereGraphql({
			$pipe: [{ $get: "age" }, { $lt: 11 }],
		});
		expect(result).toEqual("(age_lt: 11)");
	});

	it("builds an extractor using $and 1", () => {
		const result = extractWhereGraphql({
			$and: [
				{ $pipe: [{ $get: "name" }, { $eq: "Priya" }] },
				{ $pipe: [{ $get: "age" }, { $lt: 11 }] },
			],
		});
		expect(result).toEqual("(name: Priya, age_lt: 11)");
	});
});

describe("createSimpleWhereExtractor", () => {
	it("creates a simple REST-style extractor", () => {
		const extract = createSimpleWhereExtractor({
			eq: "${field}=${value}",
			gt: "${field}[gt]=${value}",
		});

		const result = extract({ $pipe: [{ $get: "age" }, { $gt: 18 }] });
		expect(result).toEqual("age[gt]=18");
	});

	it("handles AND operations with custom joiner", () => {
		const extract = createSimpleWhereExtractor(
			{
				eq: "${field}=${value}",
				ne: "${field}[ne]=${value}",
			},
			{ andJoiner: "&" },
		);

		const result = extract({
			$and: [
				{ $pipe: [{ $get: "status" }, { $eq: "active" }] },
				{ $pipe: [{ $get: "role" }, { $ne: "admin" }] },
			],
		});
		expect(result).toEqual("status=active&role[ne]=admin");
	});

	it("creates GraphQL-style extractor with different syntax", () => {
		const extract = createSimpleWhereExtractor(
			{
				eq: "${field}: ${value}",
				gt: "${field}_gt: ${value}",
			},
			{ andJoiner: ", " },
		);

		const result = extract({
			$and: [
				{ $pipe: [{ $get: "yearsActive" }, { $gt: 10 }] },
				{ $pipe: [{ $get: "specialty" }, { $eq: "paranormal investigation" }] },
			],
		});
		expect(result).toEqual(
			"yearsActive_gt: 10, specialty: paranormal investigation",
		);
	});
});

describe("extractQueryParameters", () => {
	it("extracts basic query parameters", () => {
		const query = {
			type: "skeptics",
			select: ["id", "name"],
			where: { specialty: "paranormal investigation" },
			order: { name: "asc" },
			limit: 10,
			offset: 5,
		};

		const params = extractQueryParameters(skepticismSchema, query);

		expect(params.fields).toEqual({ skeptics: ["id", "name"] });
		expect(params.includes).toEqual([]);
		expect(params.sort).toEqual([{ field: "name", direction: "asc" }]);
		expect(params.pagination).toEqual({ limit: 10, offset: 5 });
		expect(params.filters).toEqual({ specialty: "paranormal investigation" });
	});

	it("extracts relationship includes", () => {
		const query = {
			type: "skeptics",
			select: {
				name: "name",
				investigations: { select: ["title"] },
			},
		};

		const params = extractQueryParameters(skepticismSchema, query);

		expect(params.fields).toEqual({
			skeptics: ["name"],
			investigations: ["title"],
		});
		expect(params.includes).toEqual(["investigations"]);
	});

	it("extracts nested filters with paths", () => {
		const query = {
			type: "skeptics",
			select: {
				name: "name",
				investigations: {
					select: ["title"],
					where: { conclusion: "debunked" },
				},
			},
			where: { specialty: "paranormal investigation" },
		};

		const params = extractQueryParameters(skepticismSchema, query);

		expect(params.filters).toEqual({
			specialty: "paranormal investigation",
			"investigations.conclusion": "debunked",
		});
	});

	it("extracts complex expression operators", () => {
		const query = {
			type: "skeptics",
			select: ["name"],
			where: {
				yearsActive: { $gt: 10 },
				specialty: { $ne: "astrology" },
			},
		};

		const params = extractQueryParameters(skepticismSchema, query);

		expect(params.filters).toEqual({
			yearsActive: { $gt: 10 },
			specialty: { $ne: "astrology" },
		});
	});

	it("handles $and expressions by extracting simple filters", () => {
		const query = {
			type: "skeptics",
			select: ["name"],
			where: {
				$and: [
					{ specialty: "paranormal investigation" },
					{ yearsActive: { $gte: 5 } },
				],
			},
		};

		const params = extractQueryParameters(skepticismSchema, query);

		expect(params.filters).toEqual({
			specialty: "paranormal investigation",
			yearsActive: { $gte: 5 },
		});
	});

	it("marks complex expressions as _complex for advanced cases", () => {
		const query = {
			type: "skeptics",
			select: ["name"],
			where: {
				$or: [
					{ specialty: "paranormal investigation" },
					{ yearsActive: { $gt: 20 } },
				],
			},
		};

		const params = extractQueryParameters(skepticismSchema, query);

		expect(params.filters).toHaveProperty("_complex");
		expect(params.filters["_complex"]).toHaveProperty("$or");
	});
});

describe("buildQueryURL", () => {
	it("builds a complete URL with JSON:API formatter", () => {
		const query = {
			type: "skeptics",
			select: ["id", "name"],
			where: { specialty: "paranormal investigation" },
			order: { name: "desc" },
			limit: 5,
		};

		const url = buildQueryURL(
			skepticismSchema,
			query,
			"https://skeptic.api.com",
			jsonApiFormatter,
		);

		expect(url).toContain("https://skeptic.api.com/skeptics?");
		expect(url).toContain("fields[skeptics]=id,name");
		expect(url).toContain("sort=-name");
		expect(url).toContain("page[number]=1&page[size]=5");
		expect(url).toContain("filter[specialty]=paranormal investigation");
	});

	it("builds URL with REST formatter", () => {
		const query = {
			type: "skeptics",
			select: ["id", "name"],
			where: { specialty: "paranormal investigation" },
			limit: 5,
			offset: 10,
		};

		const url = buildQueryURL(
			skepticismSchema,
			query,
			"https://skeptic.api.com",
			restApiFormatter,
		);

		expect(url).toContain("fields=id,name");
		expect(url).toContain("limit=5&offset=10");
		expect(url).toContain("specialty=paranormal investigation");
	});

	it("builds URL with OData formatter", () => {
		const query = {
			type: "skeptics",
			select: ["id", "name"],
			where: { specialty: "paranormal investigation" },
			order: { name: "desc" },
			limit: 5,
		};

		const url = buildQueryURL(
			skepticismSchema,
			query,
			"https://skeptic.api.com",
			oDataFormatter,
		);

		expect(url).toContain("$select=id,name");
		expect(url).toContain("$orderby=name desc");
		expect(url).toContain("$top=5");
		expect(url).toContain("$filter=specialty eq 'paranormal investigation'");
	});
});

describe("jsonApiFormatter", () => {
	it("formats fields correctly", () => {
		const fields = { skeptics: ["id", "name"], investigations: ["title"] };
		const result = jsonApiFormatter.formatFields(fields);
		expect(result).toBe(
			"fields[skeptics]=id,name&fields[investigations]=title",
		);
	});

	it("formats includes correctly", () => {
		const includes = ["investigations", "investigations.subject"];
		const result = jsonApiFormatter.formatIncludes(includes);
		expect(result).toBe("include=investigations,investigations.subject");
	});

	it("formats sort correctly", () => {
		const sort = [
			{ field: "name", direction: "asc" },
			{ field: "yearsActive", direction: "desc" },
		];
		const result = jsonApiFormatter.formatSort(sort);
		expect(result).toBe("sort=name,-yearsActive");
	});

	it("formats pagination correctly", () => {
		const pagination = { limit: 10, offset: 20 };
		const result = jsonApiFormatter.formatPagination(pagination);
		expect(result).toBe("page[number]=3&page[size]=10");
	});

	it("formats simple filters", () => {
		const filters = { specialty: "paranormal investigation", yearsActive: 15 };
		const result = jsonApiFormatter.formatFilters(filters);
		expect(result).toBe(
			"filter[specialty]=paranormal investigation&filter[yearsActive]=15",
		);
	});

	it("formats expression filters", () => {
		const filters = { yearsActive: { $gt: 10, $lt: 30 } };
		const result = jsonApiFormatter.formatFilters(filters);
		expect(result).toBe(
			"filter[yearsActive][$gt]=10&filter[yearsActive][$lt]=30",
		);
	});

	it("skips complex expressions", () => {
		const filters = {
			specialty: "paranormal investigation",
			_complex: { $or: [{ yearsActive: { $gt: 20 } }] },
		};
		const result = jsonApiFormatter.formatFilters(filters);
		expect(result).toBe("filter[specialty]=paranormal investigation");
	});
});

describe("oDataFormatter", () => {
	it("formats expression filters with OData operators", () => {
		const filters = {
			yearsActive: { $gt: 10 },
			name: "James Randi",
			debunked: { $eq: true },
		};
		const result = oDataFormatter.formatFilters(filters);
		expect(result).toBe(
			"$filter=yearsActive gt 10 and name eq 'James Randi' and debunked eq true",
		);
	});

	it("formats path with OData syntax for single resource", () => {
		const result = oDataFormatter.formatPath(
			"https://skeptic.api.com",
			"skeptics",
			"randi-1",
		);
		expect(result).toBe("https://skeptic.api.com/skeptics('randi-1')");
	});

	it("skips complex expressions", () => {
		const filters = {
			specialty: "paranormal investigation",
			_complex: { $not: { debunked: true } },
		};
		const result = oDataFormatter.formatFilters(filters);
		expect(result).toBe("$filter=specialty eq 'paranormal investigation'");
	});
});
