import { describe, it, expect } from "vitest";
import { comparativeDefinitions } from "../../../src/expressions/definitions/comparative.js";

const { $matchesRegex } = comparativeDefinitions;

describe("$matchesRegex", () => {
	describe("apply form", () => {
		it("should match a simple pattern", () => {
			expect($matchesRegex.apply("hello", "hello world")).toBe(true);
			expect($matchesRegex.apply("hello", "goodbye world")).toBe(false);
		});

		it("should match complex patterns", () => {
			expect($matchesRegex.apply("\\d{3}-\\d{2}-\\d{4}", "123-45-6789")).toBe(true);
			expect($matchesRegex.apply("\\d{3}-\\d{2}-\\d{4}", "12-345-6789")).toBe(false);
		});

		it("should handle start and end anchors", () => {
			expect($matchesRegex.apply("^hello", "hello world")).toBe(true);
			expect($matchesRegex.apply("^hello", "say hello")).toBe(false);
			expect($matchesRegex.apply("world$", "hello world")).toBe(true);
			expect($matchesRegex.apply("world$", "world peace")).toBe(false);
		});

		it("should handle case-sensitive matching by default", () => {
			expect($matchesRegex.apply("Hello", "Hello World")).toBe(true);
			expect($matchesRegex.apply("Hello", "hello world")).toBe(false);
		});

		it("should support case-insensitive flag", () => {
			expect($matchesRegex.apply("(?i)hello", "Hello World")).toBe(true);
			expect($matchesRegex.apply("(?i)hello", "HELLO WORLD")).toBe(true);
			expect($matchesRegex.apply("(?i)hello", "goodbye")).toBe(false);
		});

		it("should support multiline flag", () => {
			const text = "line1\nline2\nline3";
			expect($matchesRegex.apply("(?m)^line2", text)).toBe(true);
			expect($matchesRegex.apply("^line2", text)).toBe(false);
		});

		it("should support dotall flag", () => {
			const text = "hello\nworld";
			expect($matchesRegex.apply("(?s)hello.world", text)).toBe(true);
			expect($matchesRegex.apply("hello.world", text)).toBe(false);
		});

		it("should support combined flags", () => {
			const text = "Hello\nWORLD";
			expect($matchesRegex.apply("(?ims)^hello.world$", text)).toBe(true);
			expect($matchesRegex.apply("(?is)hello.world", text)).toBe(true);
			expect($matchesRegex.apply("(?i)hello.world", text)).toBe(false); // no dotall
		});

		it("should handle unsupported flags gracefully", () => {
			expect($matchesRegex.apply("(?x)hello", "hello")).toBe(true); // unsupported flag stripped
			expect($matchesRegex.apply("(?q)test", "test")).toBe(true); // unsupported flag stripped
			expect($matchesRegex.apply("hello", "hello")).toBe(true); // no flags
		});

		it("should throw when input is not a string", () => {
			expect(() => $matchesRegex.apply("pattern", 123)).toThrow("$matchesRegex requires string input");
			expect(() => $matchesRegex.apply("pattern", null)).toThrow("$matchesRegex requires string input");
			expect(() => $matchesRegex.apply("pattern", undefined)).toThrow("$matchesRegex requires string input");
			expect(() => $matchesRegex.apply("pattern", [])).toThrow("$matchesRegex requires string input");
			expect(() => $matchesRegex.apply("pattern", {})).toThrow("$matchesRegex requires string input");
		});

		it("should handle invalid regex patterns", () => {
			expect(() => $matchesRegex.apply("[", "test")).toThrow(); // Invalid regex
			expect(() => $matchesRegex.apply("(?i)[", "test")).toThrow(); // Invalid regex with flags
		});
	});

	describe("evaluate form", () => {
		it("should work with evaluate form", () => {
			expect($matchesRegex.evaluate(["hello", "hello world"])).toBe(true);
			expect($matchesRegex.evaluate(["hello", "goodbye world"])).toBe(false);
		});

		it("should work with flags in evaluate form", () => {
			expect($matchesRegex.evaluate(["(?i)hello", "HELLO WORLD"])).toBe(true);
			expect($matchesRegex.evaluate(["(?m)^line2", "line1\nline2"])).toBe(true);
		});

		it("should throw with invalid input in evaluate form", () => {
			expect(() => $matchesRegex.evaluate(["pattern", 123])).toThrow("$matchesRegex requires string input");
		});
	});

	describe("normalizeWhere", () => {
		it("should normalize with attribute", () => {
			const result = $matchesRegex.normalizeWhere("test.*", { attribute: "name" });
			expect(result).toEqual({
				$pipe: [
					{ $get: "name" },
					{ $matchesRegex: "test.*" },
				],
			});
		});

		it("should normalize without attribute", () => {
			const result = $matchesRegex.normalizeWhere("test.*", { attribute: null });
			expect(result).toEqual({ $matchesRegex: "test.*" });
		});

		it("should normalize with flags", () => {
			const result = $matchesRegex.normalizeWhere("(?i)test.*", { attribute: "description" });
			expect(result).toEqual({
				$pipe: [
					{ $get: "description" },
					{ $matchesRegex: "(?i)test.*" },
				],
			});
		});
	});

	describe("edge cases", () => {
		it("should handle empty string input", () => {
			expect($matchesRegex.apply("", "")).toBe(true);
			expect($matchesRegex.apply("test", "")).toBe(false);
			expect($matchesRegex.apply(".*", "")).toBe(true);
		});

		it("should handle special regex characters in pattern", () => {
			expect($matchesRegex.apply("\\$\\^\\*\\+\\?\\.", "$^*+?.")).toBe(true);
			expect($matchesRegex.apply("test\\.com", "test.com")).toBe(true);
			expect($matchesRegex.apply("test\\.com", "testXcom")).toBe(false);
		});

		it("should handle unicode characters", () => {
			expect($matchesRegex.apply("café", "café")).toBe(true);
			expect($matchesRegex.apply("(?i)café", "CAFÉ")).toBe(true);
		});
	});
});