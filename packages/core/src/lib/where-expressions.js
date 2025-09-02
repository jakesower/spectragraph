const createComparative = (exprName) => (operand, attribute) =>
	attribute
		? { $pipe: [{ $get: attribute }, { [exprName]: operand }] }
		: { [exprName]: operand };

const buildObj = (array, fn) =>
	array.reduce((acc, item) => ({ ...acc, [item]: fn(item) }), {});

const whereExpressions = {
	// comparative
	...buildObj(
		["$eq", "$lt", "$lte", "$gt", "$gte", "$ne", "$in", "$nin"],
		createComparative,
	),

	// pattern matching
	...buildObj(
		["$matchesRegex", "$matchesLike", "$matchesGlob"],
		createComparative,
	),

	// core
	$literal: (operand, attribute) =>
		attribute
			? { $pipe: [{ $get: attribute }, { $eq: { $literal: operand } }] }
			: operand,
	$debug: (operand, attribute, { resolve }) => ({
		$debug: resolve(operand, attribute),
	}),

	// conditional
	$if: (operand, attribute, { resolve }) => ({
		$if: {
			...operand,
			if: resolve(operand.if, attribute),
		},
	}),
	$case: (operand, attribute) => ({
		$case: { ...operand, value: { $get: attribute } },
	}),
	$switch: (operand, attribute) => ({
		$switch: { ...operand, value: { $get: attribute } },
	}),

	// logical
	$and: (operand, attribute, { resolve }) => ({
		$and: operand.map((pred) => resolve(pred, attribute)),
	}),
	$or: (operand, attribute, { resolve }) => ({
		$or: operand.map((pred) => resolve(pred, attribute)),
	}),
	$not: (operand, attribute, { resolve }) => ({
		$not: resolve(operand, attribute),
	}),

	// $temporal
	$nowLocal: () => ({ $nowLocal: null }),
	$nowUTC: () => ({ $nowUTC: null }),
	$timestamp: () => ({ $timestamp: null }),
};

const looksLikeExpression = (val) =>
	val !== null &&
	typeof val === "object" &&
	!Array.isArray(val) &&
	Object.keys(val).length === 1 &&
	Object.keys(val)[0].startsWith("$");

const isExpression = (val) =>
	looksLikeExpression(val) && Object.keys(val)[0] in whereExpressions;

const checkLooksLikeExpression = (expr) => {
	if (looksLikeExpression(expr) && !isExpression(expr)) {
		throw new Error(
			`${Object.keys(expr)[0]} is not a valid expression for a where clause. Use $literal if you meant this as a literal value. ${JSON.stringify(expr)}`,
		);
	}
};

// Structure has already been validated, so no need for defensive coding/covering all cases.
export function normalizeWhereClause(where) {
	let handleAttribute;

	const resolve = (node, attribute) => {
		if (typeof node === "object" && looksLikeExpression(node)) {
			checkLooksLikeExpression(node);

			const [expressionName, operand] = Object.entries(node)[0];
			const expression = whereExpressions[expressionName];

			return expression(operand, attribute, {
				handleAttribute,
				isExpression,
				resolve,
			});
		}

		// not an expression
		return Array.isArray(node)
			? node.map((v) =>
					resolve(v, attribute, { handleAttribute, isExpression, resolve }),
				)
			: node !== null && typeof node === "object"
				? Object.keys(node).length > 1
					? {
							$and: Object.entries(node).map(([attr, val]) =>
								handleAttribute(attr, val),
							),
						}
					: handleAttribute(...Object.entries(node)[0])
				: attribute
					? { $pipe: [{ $get: attribute }, { $eq: node }] }
					: node;
	};

	handleAttribute = (attribute, value) => {
		checkLooksLikeExpression(value);

		return typeof value === "object" && value !== null
			? Array.isArray(value) || !isExpression(value)
				? { $pipe: [{ $get: attribute }, { $eq: { $literal: value } }] }
				: resolve(value, attribute)
			: { $pipe: [{ $get: attribute }, { $eq: value }] };
	};

	return resolve(where, null);
}
