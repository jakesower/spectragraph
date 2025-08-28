import { isEqual } from "es-toolkit";

const createComparativeWhereCompiler =
	(exprName) =>
	(operand, { attribute }) =>
		attribute
			? { $pipe: [{ $get: attribute }, { [exprName]: operand }] }
			: { [exprName]: operand };

const $eq = {
	name: "$eq",
	apply: isEqual,
	evaluate: ([left, right]) => isEqual(left, right),
	normalizeWhere: createComparativeWhereCompiler("$eq"),
};

const $ne = {
	name: "$ne",
	apply: (operand, inputData) => !isEqual(operand, inputData),
	evaluate: ([left, right]) => !isEqual(left, right),
	normalizeWhere: createComparativeWhereCompiler("$ne"),
};

const $gt = {
	name: "$gt",
	apply: (operand, inputData) => inputData > operand,
	evaluate: ([left, right]) => left > right,
	normalizeWhere: createComparativeWhereCompiler("$gt"),
};

const $gte = {
	name: "$gte",
	apply: (operand, inputData) => inputData >= operand,
	evaluate: ([left, right]) => left >= right,
	normalizeWhere: createComparativeWhereCompiler("$gte"),
};

const $lt = {
	name: "$lt",
	apply: (operand, inputData) => inputData < operand,
	evaluate: ([left, right]) => left < right,
	normalizeWhere: createComparativeWhereCompiler("$lt"),
};

const $lte = {
	name: "$lte",
	apply: (operand, inputData) => inputData <= operand,
	evaluate: ([left, right]) => left <= right,
	normalizeWhere: createComparativeWhereCompiler("$lte"),
};

const $in = {
	name: "$in",
	apply: (operand, inputData) => {
		if (!Array.isArray(operand)) {
			throw new Error("$in parameter must be an array");
		}
		return operand.includes(inputData);
	},
	evaluate([array, value]) {
		return this.apply(array, value);
	},
	normalizeWhere: createComparativeWhereCompiler("$in"),
};

const $nin = {
	name: "$nin",
	apply: (operand, inputData) => {
		if (!Array.isArray(operand)) {
			throw new Error("$nin parameter must be an array");
		}
		return !operand.includes(inputData);
	},
	evaluate([array, value]) {
		return this.apply(array, value);
	},
	normalizeWhere: createComparativeWhereCompiler("$nin"),
};

/**
 * Tests if a string matches a regular expression pattern.
 *
 * **Uses PCRE (Perl Compatible Regular Expression) semantics** as the canonical standard
 * for consistent behavior across all Data Prism store implementations.
 *
 * Supports inline flags using the syntax (?flags)pattern where flags can be:
 * - i: case insensitive matching
 * - m: multiline mode (^ and $ match line boundaries)
 * - s: dotall mode (. matches newlines)
 *
 * PCRE defaults (when no flags specified):
 * - Case-sensitive matching
 * - ^ and $ match string boundaries (not line boundaries)
 * - . does not match newlines
 *
 * @example
 * // Basic pattern matching
 * apply("hello", "hello world") // true
 * apply("\\d+", "abc123") // true
 *
 * @example
 * // With inline flags
 * apply("(?i)hello", "HELLO WORLD") // true (case insensitive)
 * apply("(?m)^line2", "line1\nline2") // true (multiline)
 * apply("(?s)hello.world", "hello\nworld") // true (dotall)
 * apply("(?ims)^hello.world$", "HELLO\nWORLD") // true (combined flags)
 *
 * @example
 * // In WHERE clauses
 * { name: { $matchesRegex: "^[A-Z].*" } } // Names starting with capital letter
 * { email: { $matchesRegex: "(?i).*@example\\.com$" } } // Case-insensitive email domain check
 */
const $matchesRegex = {
	name: "$matchesRegex",
	apply: (operand, inputData) => {
		if (typeof inputData !== "string") {
			throw new Error("$matchesRegex requires string input");
		}

		// Extract inline flags and clean pattern
		const flagMatch = operand.match(/^\(\?([ims]*)\)(.*)/);
		if (flagMatch) {
			const [, flags, pattern] = flagMatch;
			let jsFlags = "";

			// PCRE flag mapping - JavaScript RegExp aligns well with PCRE semantics
			if (flags.includes("i")) {
				jsFlags += "i";
			}
			if (flags.includes("m")) {
				jsFlags += "m";
			}
			if (flags.includes("s")) {
				jsFlags += "s";
			}

			const regex = new RegExp(pattern, jsFlags);
			return regex.test(inputData);
		}

		// Check for unsupported inline flags and strip them
		const unsupportedFlagMatch = operand.match(/^\(\?[^)]*\)(.*)/);
		if (unsupportedFlagMatch) {
			// Unsupported flags detected, use pattern without flags (PCRE defaults)
			const [, pattern] = unsupportedFlagMatch;
			const regex = new RegExp(pattern);
			return regex.test(inputData);
		}

		// No inline flags - use PCRE defaults
		// ^ and $ match string boundaries, . doesn't match newlines, case-sensitive
		const regex = new RegExp(operand);
		return regex.test(inputData);
	},
	evaluate([pattern, string]) {
		return this.apply(pattern, string);
	},
	normalizeWhere: createComparativeWhereCompiler("$matchesRegex"),
};

/**
 * Tests if a string matches a SQL LIKE pattern.
 *
 * Provides database-agnostic LIKE pattern matching with SQL standard semantics:
 * - % matches any sequence of characters (including none)
 * - _ matches exactly one character
 * - Case-sensitive matching (consistent across databases)
 *
 * @example
 * // Basic LIKE patterns
 * apply("hello%", "hello world") // true
 * apply("%world", "hello world") // true
 * apply("h_llo", "hello") // true
 * apply("h_llo", "hallo") // true
 *
 * @example
 * // In WHERE clauses
 * { name: { $matchesLike: "John%" } } // Names starting with "John"
 * { email: { $matchesLike: "%@gmail.com" } } // Gmail addresses
 * { code: { $matchesLike: "A_B_" } } // Codes like "A1B2", "AXBY"
 */
const $matchesLike = {
	name: "$matchesLike",
	apply: (operand, inputData) => {
		if (typeof inputData !== "string") {
			throw new Error("$matchesLike requires string input");
		}

		// Convert SQL LIKE pattern to JavaScript regex
		// Escape regex special characters except % and _
		let regexPattern = operand
			.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") // Escape regex special chars
			.replace(/%/g, ".*") // % becomes .*
			.replace(/_/g, "."); // _ becomes .

		// Anchor the pattern to match the entire string
		regexPattern = "^" + regexPattern + "$";

		const regex = new RegExp(regexPattern);
		return regex.test(inputData);
	},
	evaluate([pattern, string]) {
		return this.apply(pattern, string);
	},
	normalizeWhere: createComparativeWhereCompiler("$matchesLike"),
};

/**
 * Tests if a string matches a Unix shell GLOB pattern.
 *
 * Provides database-agnostic GLOB pattern matching with Unix shell semantics:
 * - * matches any sequence of characters (including none)
 * - ? matches exactly one character
 * - [chars] matches any single character in the set
 * - [!chars] or [^chars] matches any character not in the set
 * - Case-sensitive matching
 *
 * @example
 * // Basic GLOB patterns
 * apply("hello*", "hello world") // true
 * apply("*world", "hello world") // true
 * apply("h?llo", "hello") // true
 * apply("h?llo", "hallo") // true
 * apply("[hw]ello", "hello") // true
 * apply("[hw]ello", "wello") // true
 * apply("[!hw]ello", "bello") // true
 *
 * @example
 * // In WHERE clauses
 * { filename: { $matchesGlob: "*.txt" } } // Text files
 * { name: { $matchesGlob: "[A-Z]*" } } // Names starting with capital
 * { code: { $matchesGlob: "IMG_[0-9][0-9][0-9][0-9]" } } // Image codes
 */
const $matchesGlob = {
	name: "$matchesGlob",
	apply: (operand, inputData) => {
		if (typeof inputData !== "string") {
			throw new Error("$matchesGlob requires string input");
		}

		// Convert GLOB pattern to JavaScript regex
		let regexPattern = "";
		let i = 0;

		while (i < operand.length) {
			const char = operand[i];

			if (char === "*") {
				regexPattern += ".*";
			} else if (char === "?") {
				regexPattern += ".";
			} else if (char === "[") {
				// Handle character classes
				let j = i + 1;
				let isNegated = false;

				// Check for negation
				if (j < operand.length && (operand[j] === "!" || operand[j] === "^")) {
					isNegated = true;
					j++;
				}

				// Find the closing bracket
				let classContent = "";
				while (j < operand.length && operand[j] !== "]") {
					classContent += operand[j];
					j++;
				}

				if (j < operand.length) {
					// Valid character class
					regexPattern +=
						"[" +
						(isNegated ? "^" : "") +
						classContent.replace(/\\/g, "\\\\") +
						"]";
					i = j;
				} else {
					// No closing bracket, treat as literal
					regexPattern += "\\[";
				}
			} else {
				// Escape regex special characters
				regexPattern += char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			}
			i++;
		}

		// Anchor the pattern to match the entire string
		regexPattern = "^" + regexPattern + "$";

		const regex = new RegExp(regexPattern);
		return regex.test(inputData);
	},
	evaluate([pattern, string]) {
		return this.apply(pattern, string);
	},
	normalizeWhere: createComparativeWhereCompiler("$matchesGlob"),
};

export const comparativeDefinitions = {
	$eq,
	$gt,
	$gte,
	$lt,
	$lte,
	$ne,
	$in,
	$nin,
	$matchesRegex,
	$matchesLike,
	$matchesGlob,
};
