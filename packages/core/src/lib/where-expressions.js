import { mapValues } from "es-toolkit";

const distributingExpressions = {
	$and: (operand, { resolve }) => ({
		$and: operand.map(resolve),
	}),
	$or: (operand, { resolve }) => ({
		$or: operand.map(resolve),
	}),
	$not: (operand, { resolve }) => ({
		$not: resolve(operand),
	}),
};

const looksLikeExpression = (val) =>
	val !== null &&
	typeof val === "object" &&
	!Array.isArray(val) &&
	Object.keys(val).length === 1 &&
	Object.keys(val)[0].startsWith("$");

// structure has already been validated, so no need for defensive coding/covering all cases.
export function normalizeWhereClause(where) {
	const resolve = (node) => {
		if (looksLikeExpression(node)) {
			const [expressionName, operand] = Object.entries(node)[0];

			// distributing expressions ($and/$or/$not) recursively normalize their operands
			if (expressionName in distributingExpressions) {
				const expression = distributingExpressions[expressionName];
				return expression(operand, { resolve });
			}

			// non-distributing expressions are returned as-is
			return node;
		}

		if (typeof node === "object" && node !== null && !Array.isArray(node)) {
			return {
				$matchesAll: mapValues(node, (n) =>
					Array.isArray(n) ? { $in: n } : n,
				),
			};
		}

		throw new Error("where clauses must either be objects or expressions");
	};

	return resolve(where);
}
