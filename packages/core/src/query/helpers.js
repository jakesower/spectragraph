import { pick } from "es-toolkit";
import { looksLikeExpression } from "../lib/helpers.js";

const propHandler = (operand) => ({ paths: [[operand]], traverse: [operand] });
const dottedPropHandler = (exprName) => (operand) => {
	try {
		return {
			paths: [operand.split(".")],
			traverse: operand.split("."),
		};
	} catch {
		throw new Error(
			`${exprName} expects a string operand, got ${typeof operand}`,
			{
				cause: `${exprName} expects a string operand, got ${typeof operand}`,
			},
		);
	}
};

const matchesHandler = (operand, { apply }) => ({
	paths: Object.entries(operand).flatMap(([key, val]) => [
		[key],
		...apply(val).paths.map((v) => [key, ...v]),
	]),
});

const resolveStringOrExpression = (strOrExprs, apply) => ({
	paths: [
		strOrExprs.flatMap((strOrExpr) =>
			typeof strOrExpr === "string" ? strOrExpr : apply(strOrExpr).paths,
		),
	],
});

const extendExpandingExpressions = {
	$literal: () => ({ paths: [] }),
	$get: (operand) => {
		const asArray = Array.isArray(operand) ? operand : operand.split(/\./);
		const filtered = asArray.filter((part) => part !== "$");
		return {
			paths: [filtered],
			traverse: filtered,
		};
	},
	$prop: propHandler,
	$exists: dottedPropHandler("$exists"),
	$matchesAll: matchesHandler,
	$matchesAny: matchesHandler,
	$filterBy: matchesHandler,
	$pluck: dottedPropHandler("$pluck"),
	$pipe: (operand, { apply }) => {
		const walk = ({ paths, traverse }, step) => {
			const stepResult = apply(step);
			return {
				paths: [
					...paths,
					...stepResult.paths.map((resPath) => [...traverse, ...resPath]),
				],
				traverse: stepResult.traverse
					? [...traverse, ...stepResult.traverse]
					: traverse,
			};
		};

		return operand.reduce(walk, { paths: [], traverse: [] });
	},
	$sort: (operand, { apply }) => {
		const normal =
			typeof operand === "string"
				? [operand]
				: Array.isArray(operand.by)
					? operand.by
					: [operand.by];

		return resolveStringOrExpression(normal, apply);
	},
	$groupBy: (operand, { apply }) => {
		const normal = Array.isArray(operand) ? operand : [operand];
		return resolveStringOrExpression(normal, apply);
	},
};

/**
 * Extracts all property paths referenced in a query selection (select clause value or expression).
 * Returns an object with a `paths` array containing dot-notated path segments and optionally
 * a `traverse` array indicating which path should be followed for piped/nested operations.
 *
 * @param {*} selection - The selection to analyze (can be array, object, expression, or primitive)
 * @returns {{ paths: string[][], traverse?: string[] }} Object containing extracted paths
 *
 * @example
 * extractQuerySelection({ $get: "home.name" })
 * // Returns: { paths: [["home", "name"]], traverse: ["home", "name"] }
 *
 * @example
 * extractQuerySelection({ $pluck: "name" })
 * // Returns: { paths: [["name"]], traverse: ["name"] }
 */
export const extractQuerySelection = (selection) => {
	if (Array.isArray(selection)) {
		return {
			paths: selection.flatMap((sel) => extractQuerySelection(sel).paths),
		};
	} else if (looksLikeExpression(selection)) {
		const [exprName, operand] = Object.entries(selection)[0];
		return extendExpandingExpressions[exprName]
			? extendExpandingExpressions[exprName](operand, {
					apply: extractQuerySelection,
				})
			: pick(extractQuerySelection(operand), ["paths"]);
	} else if (typeof selection === "object" && selection !== null) {
		return {
			paths: Object.values(selection).flatMap(
				(sel) => extractQuerySelection(sel).paths,
			),
		};
	} else {
		return { paths: [] };
	}
};
