export const DEFAULT_SELECT_EXPRESSIONS = {
	$if: {
				where: (operand, { evaluate, isExpression }) => {
			const condition = evaluate(operand.if);
			const thenClause = isExpression(operand.then)
				? evaluate(operand.then)
				: "?";
			const elseClause = isExpression(operand.else)
				? evaluate(operand.else)
				: "?";
			return `CASE WHEN ${condition} THEN ${thenClause} ELSE ${elseClause} END`;
		},
		vars: (operand, { evaluate, isExpression }) => {
			const ifResult = evaluate(operand.if);
			const vars =
				Array.isArray(ifResult) && ifResult.length > 0 ? ifResult : [];
			if (isExpression(operand.then)) {
				const thenResult = evaluate(operand.then);
				vars.push(...(Array.isArray(thenResult) ? thenResult : [thenResult]));
			} else {
				vars.push(operand.then);
			}
			if (isExpression(operand.else)) {
				const elseResult = evaluate(operand.else);
				vars.push(...(Array.isArray(elseResult) ? elseResult : [elseResult]));
			} else {
				vars.push(operand.else);
			}
			return vars.flat();
		},
	},
};
