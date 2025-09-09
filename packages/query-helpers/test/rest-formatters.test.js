import { expect, it, describe } from "vitest";
import skepticismSchema from "./fixtures/skepticism.schema.json";
import { extractWhere } from "../src/rest-formatters.js";
import { normalizeQuery } from "@data-prism/core";
import { compileWhereFormatter } from "../src/helpers.js";

describe("where", () => {
	const formatBasic = compileWhereFormatter({
		$eq: "${attribute}=${value}",
		$ne: "${attribute}_ne=${value}",
		$lt: "${attribute}_lt=${value}",
		$lte: "${attribute}_lte=${value}",
		$gt: "${attribute}_gt=${value}",
		$gte: "${attribute}_gte=${value}",
	});

	describe("$eq and $and between attributes", () => {
		it("processes the simplest equality condition", () => {
			const { where } = normalizeQuery(skepticismSchema, {
				type: "skeptics",
				select: ["*"],
				where: { name: "Steven Novella" },
			});

			const result = extractWhere(where);
			expect(result).toEqual([
				{
					attribute: "name",
					value: "Steven Novella",
					expressionName: "$eq",
				},
			]);

			const formatted = result.map(formatBasic);
			expect(formatted).toEqual(["name=Steven Novella"]);
		});

		it("handles two equality conditions", () => {
			const { where } = normalizeQuery(skepticismSchema, {
				type: "skeptics",
				select: ["*"],
				where: {
					name: "Steven Novella",
					famousQuote:
						"Some claims deserve ridicule, and anything less falsely elevates them.",
				},
			});

			const result = extractWhere(where);
			expect(result).toEqual([
				{
					attribute: "name",
					value: "Steven Novella",
					expressionName: "$eq",
				},
				{
					attribute: "famousQuote",
					value:
						"Some claims deserve ridicule, and anything less falsely elevates them.",
					expressionName: "$eq",
				},
			]);

			const formatted = result.map(formatBasic);
			expect(formatted).toEqual([
				"name=Steven Novella",
				"famousQuote=Some claims deserve ridicule, and anything less falsely elevates them.",
			]);
		});
	});

	describe("comparative expressions", () => {
		["$ne", "$lt", "$lte", "$gt", "$gte"].forEach((expr) => {
			it(`handles ${expr}`, () => {
				const { where } = normalizeQuery(skepticismSchema, {
					type: "weirdBeliefs",
					select: "*",
					where: { believersCount: { [expr]: 100000 } },
				});

				const result = extractWhere(where);
				expect(result).toEqual([
					{
						attribute: "believersCount",
						expressionName: expr,
						value: 100000,
					},
				]);

				const formatted = result.map(formatBasic);
				expect(formatted).toEqual([`believersCount_${expr.slice(1)}=100000`]);
			});
		});
	});
});
