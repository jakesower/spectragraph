import { expect, it, describe, vi } from "vitest";
import { createRestStore } from "../src/rest-store.js";
import skepticismSchema from "./fixtures/skepticism.schema.json";

describe("createRestStore", () => {
	it("queries skeptics with mocked get handler", async () => {
		const mockGet = vi.fn().mockResolvedValue([
			{
				id: "1",
				name: "James Randi",
				specialty: "Magic debunking",
				yearsActive: 50,
				famousQuote: "No amount of belief makes something a fact.",
			},
		]);

		const config = {
			specialHandlers: [],
			resourceConfig: {
				skeptics: {
					get: mockGet,
				},
			},
		};

		const store = createRestStore(skepticismSchema, config);

		const result = await store.query({
			type: "skeptics",
			select: ["name", "specialty"],
		});

		expect(mockGet).toHaveBeenCalledWith(
			{
				type: "skeptics",
				select: { name: "name", specialty: "specialty" },
			},
			expect.objectContaining({
				schema: skepticismSchema,
				config,
			}),
		);

		expect(result).toEqual([
			{
				name: "James Randi",
				specialty: "Magic debunking",
			},
		]);
	});

	it("queries skeptics with mappers", async () => {
		const mockGet = vi.fn().mockResolvedValue([
			{
				id: "1",
				moniker: "James Randi",
				specialty: "Magic debunking",
				decadesActive: 5,
				famousQuote: "No amount of belief makes something a fact.",
			},
		]);

		const config = {
			specialHandlers: [],
			resourceConfig: {
				skeptics: {
					get: mockGet,
					mappers: {
						name: "moniker",
						yearsActive: (res) => Math.round(res.decadesActive / 10),
					},
				},
			},
		};

		const store = createRestStore(skepticismSchema, config);

		const result = await store.query({
			type: "skeptics",
			select: ["name", "specialty"],
		});

		expect(mockGet).toHaveBeenCalledWith(
			{
				type: "skeptics",
				select: { name: "name", specialty: "specialty" },
			},
			expect.objectContaining({
				schema: skepticismSchema,
				config,
			}),
		);

		expect(result).toEqual([
			{
				name: "James Randi",
				specialty: "Magic debunking",
			},
		]);
	});

	it("queries skeptics with related investigations", async () => {
		const mockSkepticsGet = vi.fn().mockResolvedValue([
			{
				id: "1",
				name: "James Randi",
				specialty: "Magic debunking",
				yearsActive: 50,
				famousQuote: "No amount of belief makes something a fact.",
			},
		]);

		const mockInvestigationsGet = vi.fn().mockResolvedValue([
			{
				id: "inv1",
				title: "Testing Uri Geller's Spoon Bending",
				claimTested: "Psychokinetic metal bending",
				methodsUsed: ["Controlled environment", "Video recording"],
				conclusion: "No paranormal activity detected",
				publicationYear: 1973,
				investigator: "1",
			},
		]);

		const config = {
			specialHandlers: [],
			resourceConfig: {
				skeptics: {
					get: mockSkepticsGet,
				},
				investigations: {
					get: mockInvestigationsGet,
				},
			},
		};

		const store = createRestStore(skepticismSchema, config);

		const result = await store.query({
			type: "skeptics",
			select: ["name", { investigations: { select: ["title", "conclusion"] } }],
		});

		expect(mockSkepticsGet).toHaveBeenCalledWith(
			{
				type: "skeptics",
				select: { name: "name", investigations: expect.any(Object) },
			},
			expect.objectContaining({
				schema: skepticismSchema,
				config,
			}),
		);

		expect(mockInvestigationsGet).toHaveBeenCalledWith(
			{
				type: "investigations",
				select: { title: "title", conclusion: "conclusion" },
			},
			expect.objectContaining({
				schema: skepticismSchema,
				config,
				parentQuery: expect.any(Object),
			}),
		);

		expect(result).toEqual([
			{
				name: "James Randi",
				investigations: [
					{
						title: "Testing Uri Geller's Spoon Bending",
						conclusion: "No paranormal activity detected",
					},
				],
			},
		]);
	});

	it("queries skeptics with related investigations with a configured relationship field", async () => {
		const mockSkepticsGet = vi.fn().mockResolvedValue([
			{
				id: "1",
				name: "James Randi",
				specialty: "Magic debunking",
				yearsActive: 50,
				famousQuote: "No amount of belief makes something a fact.",
			},
		]);

		const mockInvestigationsGet = vi.fn().mockResolvedValue([
			{
				id: "inv1",
				title: "Testing Uri Geller's Spoon Bending",
				claimTested: "Psychokinetic metal bending",
				methodsUsed: ["Controlled environment", "Video recording"],
				conclusion: "No paranormal activity detected",
				publicationYear: 1973,
				investigator_id: "1",
			},
		]);

		const config = {
			specialHandlers: [],
			resourceConfig: {
				skeptics: {
					get: mockSkepticsGet,
				},
				investigations: {
					mappers: {
						investigator: "investigator_id",
					},
					get: mockInvestigationsGet,
				},
			},
		};

		const store = createRestStore(skepticismSchema, config);

		const result = await store.query({
			type: "skeptics",
			select: ["name", { investigations: { select: ["title", "conclusion"] } }],
		});

		expect(mockSkepticsGet).toHaveBeenCalledWith(
			{
				type: "skeptics",
				select: { name: "name", investigations: expect.any(Object) },
			},
			expect.objectContaining({
				schema: skepticismSchema,
				config,
			}),
		);

		expect(mockInvestigationsGet).toHaveBeenCalledWith(
			{
				type: "investigations",
				select: { title: "title", conclusion: "conclusion" },
			},
			expect.objectContaining({
				schema: skepticismSchema,
				config,
				parentQuery: expect.any(Object),
			}),
		);

		expect(result).toEqual([
			{
				name: "James Randi",
				investigations: [
					{
						title: "Testing Uri Geller's Spoon Bending",
						conclusion: "No paranormal activity detected",
					},
				],
			},
		]);
	});
});
