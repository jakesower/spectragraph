import { mapValues } from "es-toolkit";

const distributingExpressions = {
	$and: (operand, attribute, { resolve }) => ({
		$and: operand.map((pred) => resolve(pred, attribute)),
	}),
	$or: (operand, attribute, { resolve }) => ({
		$or: operand.map((pred) => resolve(pred, attribute)),
	}),
	$not: (operand, attribute, { resolve }) => ({
		$not: resolve(operand, attribute),
	}),
};

const looksLikeExpression = (val) =>
	val !== null &&
	typeof val === "object" &&
	!Array.isArray(val) &&
	Object.keys(val).length === 1 &&
	Object.keys(val)[0].startsWith("$");

// Structure has already been validated, so no need for defensive coding/covering all cases.
export function normalizeWhereClause(where) {
	const resolve = (node, attribute) => {
		if (looksLikeExpression(node)) {
			const [expressionName, operand] = Object.entries(node)[0];

			// attribute information needs to be distributed
			if (expressionName in distributingExpressions) {
				const expression = distributingExpressions[expressionName];
				return expression(operand, attribute, { resolve });
			}

			return attribute ? { $pipe: [{ $get: attribute }, node] } : node;
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

	return resolve(where, null);
}
