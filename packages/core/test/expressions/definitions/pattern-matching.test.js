import { describe, expect, it } from "vitest";
import { comparativeDefinitions } from "../../../src/expressions/definitions/comparative.js";

const { $matchesLike, $matchesGlob } = comparativeDefinitions;

describe("$matchesLike", () => {
	it("handles basic LIKE patterns", () => {
		expect($matchesLike.apply("hello%", "hello world")).toBe(true);
		expect($matchesLike.apply("hello%", "hello")).toBe(true);
		expect($matchesLike.apply("hello%", "hi")).toBe(false);
		
		expect($matchesLike.apply("%world", "hello world")).toBe(true);
		expect($matchesLike.apply("%world", "world")).toBe(true);
		expect($matchesLike.apply("%world", "hi")).toBe(false);
		
		expect($matchesLike.apply("h_llo", "hello")).toBe(true);
		expect($matchesLike.apply("h_llo", "hallo")).toBe(true);
		expect($matchesLike.apply("h_llo", "hxllo")).toBe(true);
		expect($matchesLike.apply("h_llo", "hllo")).toBe(false);
		expect($matchesLike.apply("h_llo", "hello world")).toBe(false);
	});

	it("handles email patterns", () => {
		expect($matchesLike.apply("%@gmail.com", "test@gmail.com")).toBe(true);
		expect($matchesLike.apply("%@gmail.com", "user123@gmail.com")).toBe(true);
		expect($matchesLike.apply("%@gmail.com", "test@yahoo.com")).toBe(false);
	});

	it("escapes regex special characters", () => {
		expect($matchesLike.apply("test.txt", "test.txt")).toBe(true);
		expect($matchesLike.apply("test.txt", "testXtxt")).toBe(false); // . should be literal
		expect($matchesLike.apply("a+b", "a+b")).toBe(true);
		expect($matchesLike.apply("a+b", "aab")).toBe(false); // + should be literal
	});
});

describe("$matchesGlob", () => {
	it("handles basic GLOB patterns", () => {
		expect($matchesGlob.apply("hello*", "hello world")).toBe(true);
		expect($matchesGlob.apply("hello*", "hello")).toBe(true);
		expect($matchesGlob.apply("hello*", "hi")).toBe(false);
		
		expect($matchesGlob.apply("*world", "hello world")).toBe(true);
		expect($matchesGlob.apply("*world", "world")).toBe(true);
		expect($matchesGlob.apply("*world", "hi")).toBe(false);
		
		expect($matchesGlob.apply("h?llo", "hello")).toBe(true);
		expect($matchesGlob.apply("h?llo", "hallo")).toBe(true);
		expect($matchesGlob.apply("h?llo", "hxllo")).toBe(true);
		expect($matchesGlob.apply("h?llo", "hllo")).toBe(false);
		expect($matchesGlob.apply("h?llo", "hello world")).toBe(false);
	});

	it("handles character classes", () => {
		expect($matchesGlob.apply("[hw]ello", "hello")).toBe(true);
		expect($matchesGlob.apply("[hw]ello", "wello")).toBe(true);
		expect($matchesGlob.apply("[hw]ello", "bello")).toBe(false);
		
		expect($matchesGlob.apply("[A-Z]*", "Hello")).toBe(true);
		expect($matchesGlob.apply("[A-Z]*", "hello")).toBe(false);
		
		expect($matchesGlob.apply("[!hw]ello", "bello")).toBe(true);
		expect($matchesGlob.apply("[!hw]ello", "hello")).toBe(false);
		expect($matchesGlob.apply("[!hw]ello", "wello")).toBe(false);
	});

	it("handles file extensions", () => {
		expect($matchesGlob.apply("*.txt", "file.txt")).toBe(true);
		expect($matchesGlob.apply("*.txt", "document.txt")).toBe(true);
		expect($matchesGlob.apply("*.txt", "file.pdf")).toBe(false);
		
		expect($matchesGlob.apply("IMG_[0-9][0-9][0-9][0-9]", "IMG_1234")).toBe(true);
		expect($matchesGlob.apply("IMG_[0-9][0-9][0-9][0-9]", "IMG_abcd")).toBe(false);
	});

	it("escapes regex special characters", () => {
		expect($matchesGlob.apply("test.txt", "test.txt")).toBe(true);
		expect($matchesGlob.apply("test.txt", "testXtxt")).toBe(false); // . should be literal
		expect($matchesGlob.apply("a+b", "a+b")).toBe(true);
		expect($matchesGlob.apply("a+b", "aab")).toBe(false); // + should be literal
	});
});