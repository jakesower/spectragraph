/**
 * @param {Object} whereClause
 * @param {any} expressionEngine
 * @returns {any}
 */
export function buildWhereExpression(whereClause, expressionEngine) {
	if (expressionEngine.isExpression(whereClause)) {
		const [name, params] = Object.entries(whereClause)[0];
		const built = Array.isArray(params)
			? params.map((p) => buildWhereExpression(p, expressionEngine))
			: buildWhereExpression(params, expressionEngine);

		return { [name]: built };
	}

	const whereExpressions = Object.entries(whereClause).map(
		([propPath, propVal]) => ({
			$pipe: [
				{ $get: propPath },
				expressionEngine.isExpression(propVal) ? propVal : { $eq: propVal },
			],
		}),
	);

	return whereExpressions.length > 1
		? { $and: whereExpressions }
		: whereExpressions[0];
}
