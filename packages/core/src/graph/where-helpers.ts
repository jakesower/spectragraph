import { get, mapValues } from "lodash-es";
import { defaultExpressionEngine } from "@data-prism/expressions";

export function buildWhereExpression(whereClause: object) {
	if (defaultExpressionEngine.isExpression(whereClause)) {
		const [name, params] = Object.entries(whereClause)[0] as any[];
		const built = Array.isArray(params)
			? params.map(buildWhereExpression)
			: buildWhereExpression(params);

		return { [name]: built };
	}

	const whereExpressions = Object.entries(whereClause).map(([propPath, expr]) =>
		defaultExpressionEngine.isExpression(expr)
			? { $pipe: [{ $get: propPath }, expr] }
			: { $pipe: [{ $get: propPath }, { $eq: expr }] },
	);

	return whereExpressions.length > 1 ? { $and: whereExpressions } : whereExpressions[0];
}
