import { defaultExpressionEngine } from "@data-prism/expressions";

export function buildWhereExpression(whereClause: object, expressionEngine) {
	if (expressionEngine.isExpression(whereClause)) {
		const [name, params] = Object.entries(whereClause)[0] as any[];
		const built = Array.isArray(params)
			? params.map((p) => buildWhereExpression(p, expressionEngine))
			: buildWhereExpression(params, expressionEngine);

		return { [name]: built };
	}

	const whereExpressions = Object.entries(whereClause).map(
		([propPath, propVal]) => ({
			$pipe: [
				{
					$ifThenElse: {
						if: { $pipe: [{ $get: propPath }, { $eq: null }] },
						then: null,
						else: {
							$pipe: [{ $ensurePath: propPath }, { $get: propPath }],
						},
					},
				},
				expressionEngine.isExpression(propVal) ? propVal : { $eq: propVal },
			],
		}),
	);

	return whereExpressions.length > 1
		? { $and: whereExpressions }
		: whereExpressions[0];
}
