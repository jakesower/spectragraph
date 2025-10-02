const distributingExpressions = {
	// logical - need to be included for validation
	$and: (operand, attribute, { resolve }) => ({
		$and: operand.map((pred) => resolve(pred, attribute)),
	}),
	$or: (operand, attribute, { resolve }) => ({
		$or: operand.map((pred) => resolve(pred, attribute)),
	}),
	$not: (operand, attribute, { resolve }) => ({
		$not: resolve(operand, attribute),
	}),
	$identity: (operand, attribute, { resolve }) => ({
		$identity: resolve(operand, attribute),
	}),
	$literal: (operand, attribute) =>
		attribute
			? { $pipe: [{ $get: attribute }, { $eq: { $literal: operand } }] }
			: operand,
	$debug: (operand, attribute, { resolve }) => ({
		$debug: resolve(operand, attribute),
	}),
	$if: (operand, attribute, { resolve }) => ({
		$if: {
			if: resolve(operand.if, attribute),
			then: resolve(operand.then, null),
			else: resolve(operand.else, null),
		},
	}),
	$case: (operand, attribute) => ({
		$case: { ...operand, value: { $get: attribute } },
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
	let handleAttribute;

	const resolve = (node, attribute) => {
		// handle expressions: if it looks like an expression, assume it is (it passed validation)
		if (typeof node === "object" && looksLikeExpression(node)) {
			const [expressionName, operand] = Object.entries(node)[0];

			// attribute information needs to be distributed
			if (expressionName in distributingExpressions) {
				const expression = distributingExpressions[expressionName];
				return expression(operand, attribute, { resolve });
			}

			// it's some other expression: stop here
			return attribute ? { $pipe: [{ $get: attribute }, node] } : node;
		}

		// map over arrays
		if (Array.isArray(node)) {
			return node.map((v) => resolve(v, attribute, { resolve }));
		}

		// handle nulls and literals
		if (node === null || typeof node !== "object") {
			return attribute ? { $pipe: [{ $get: attribute }, { $eq: node }] } : node;
		}

		// handle stuff like { attribute: 5 } or { attribute: { $and: [...] } }
		return Object.keys(node).length === 0
			? {}
			: Object.keys(node).length === 1
				? handleAttribute(...Object.entries(node)[0])
				: {
						$and: Object.entries(node).map(([attr, val]) =>
							handleAttribute(attr, val),
						),
					};
	};

	handleAttribute = (attribute, value) => {
		return typeof value === "object" && value !== null
			? Array.isArray(value)
				? { $pipe: [{ $get: attribute }, { $in: value }] }
				: resolve(value, attribute)
			: { $pipe: [{ $get: attribute }, { $eq: value }] };
	};

	return resolve(where, null);
}
