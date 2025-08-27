const $if = {
	name: "$if",
	apply: (operand, inputData, { apply, isExpression }) => {
		if (
			!isExpression(operand.if) &&
			operand.if !== true &&
			operand.if !== false
		) {
			throw new Error('"if" must be an expression, true, or false');
		}

		const outcome = apply(operand.if, inputData) ? operand.then : operand.else;
		return isExpression(outcome) ? apply(outcome, inputData) : outcome;
	},
	evaluate: (operand, { evaluate }) => {
		const conditionResult =
			typeof operand.if === "boolean" ? operand.if : evaluate(operand.if);
		const outcome = conditionResult ? operand.then : operand.else;
		return typeof outcome === "object" && outcome !== null
			? evaluate(outcome)
			: outcome;
	},
	controlsEvaluation: true,
	normalizeWhere: (operand, context) => ({
		$if: {
			if: context.normalizeWhere(operand.if, null),
			then:
				typeof operand.then === "object" && operand.then !== null
					? context.normalizeWhere(operand.then, context)
					: operand.then,
			else:
				typeof operand.else === "object" && operand.else !== null
					? context.normalizeWhere(operand.else, context)
					: operand.else,
		},
	}),
};

const $case = {
	name: "$case",
	apply: (operand, inputData, { apply, isExpression }) => {
		// Evaluate the value once
		const value = isExpression(operand.value)
			? apply(operand.value, inputData)
			: operand.value;

		// Check each case
		for (const caseItem of operand.cases) {
			let matches = false;

			// Handle both simple equality and complex expressions
			if (isExpression(caseItem.when)) {
				// For expressions that access properties from the original object (like $get),
				// we need to evaluate with the original argument.
				// For comparison expressions, we typically want to evaluate with the value.
				const whenExpressionName = Object.keys(caseItem.when)[0];
				const evaluationContext =
					whenExpressionName === "$get" ? inputData : value;
				matches = apply(caseItem.when, evaluationContext);
			} else {
				// Simple equality comparison
				matches = value === caseItem.when;
			}

			if (matches) {
				return isExpression(caseItem.then)
					? apply(caseItem.then, inputData)
					: caseItem.then;
			}
		}

		// Return default if no case matches
		return isExpression(operand.default)
			? apply(operand.default, inputData)
			: operand.default;
	},
	evaluate(operand, context) {
		const [trueOperand, value] = operand;
		return this.apply(trueOperand, value, context);
	},
	controlsEvaluation: true,
	normalizeWhere: (operand) => ({
		$case: {
			value: operand.value,
			cases: operand.cases.map((caseItem) => ({
				when: caseItem.when,
				then: caseItem.then,
			})),
			default: operand.default,
		},
	}),
};

export const conditionalDefinitions = { $if, $case };
