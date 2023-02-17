import { createEvaluator } from "@data-prism/expressions";

export const evaluators = {
	id: createEvaluator({}),
};

export function evaluateId(expression) {
	return evaluators.id.evaluate(expression);
}
