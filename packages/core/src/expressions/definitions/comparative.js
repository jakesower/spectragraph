import { isEqual } from "lodash-es";

const createComparativeWhereCompiler =
	(exprName) =>
	(operand, { attribute }) => {
		if (!attribute) {
			// When used in conditional expressions, return the expression as-is
			return { [exprName]: operand };
		}
		return { $pipe: [{ $get: attribute }, { [exprName]: operand }] };
	};

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
};
