import { isExpression } from "./expressions.js";

export const distribute = (propertyExpression: { [k: string]: any }, definitions) => {
	if (isExpression(propertyExpression, definitions)) {
		const [exprName, exprArgs] = Object.entries(propertyExpression)[0];
		const { distribute: distributeParams } = definitions[exprName];

		return distributeParams
			? distributeParams(exprArgs, (subExpr) => distribute(subExpr, definitions))
			: propertyExpression;
	}

	const exprs = Object.entries(propertyExpression).map(([prop, expr]) => {
		if (!isExpression(expr, definitions)) {
			return { $pipe: [{ $prop: prop }, { $eq: expr }] };
		}

		const [exprName, exprArgs] = Object.entries(expr)[0];
		const { distribute: exprDistribute } = definitions[exprName];

		return exprDistribute(prop, exprArgs, (subExpr) => distribute(subExpr, definitions));
	});

	return exprs.length > 1 ? { $and: exprs } : exprs[0];
};
