import { get, mapValues } from "lodash-es";
import { MultiResult } from "./result";
import { createExpressionEngine } from "@data-prism/expression";

export type Projection = {
	[k: string]: any;
};

function distributeStrings(expression) {
	const { isExpression } = createExpressionEngine({});

	if (typeof expression === "string") {
		const [iteratee, ...rest] = expression.split(".$.");
		if (rest.length === 0) return { $get: expression };

		return {
			$flatMap: [distributeStrings(iteratee), distributeStrings(rest.join(".$."))],
		};
	}

	if (!isExpression(expression)) {
		return Array.isArray(expression)
			? expression.map(distributeStrings)
			: typeof expression === "object"
				? mapValues(expression, distributeStrings)
				: expression;
	}

	const [expressionName, expressionArgs] = Object.entries(expression)[0];

	const terminalExpressions = ["$literal", "$var", "$get", "$prop"];
	if (terminalExpressions.includes(expressionName)) return expression;

	return { [expressionName]: distributeStrings(expressionArgs) };
}

export function project(results: MultiResult, projection: Projection) {
	const { evaluate } = createExpressionEngine({});

	const projFns = mapValues(projection, (projProp) => {
		const expr = distributeStrings(projProp);
		return (result) => evaluate(expr, result);
	});

	return results.map((result) => {
		return mapValues(projFns, (fn) => fn(result) ?? null);
	});
}
