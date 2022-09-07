export function isValidExpression(expression, operators) {
  return (
    typeof expression === "object" &&
    !Array.isArray(expression) &&
    Object.keys(expression).length === 1 &&
    Object.keys(expression)[0] in operators
  );
}

export function compileExpression(expression, operators, context) {
  const compile = (subExpression) => {
    const looksLikeExpression =
      typeof subExpression === "object" && !Array.isArray(subExpression);

    if (!looksLikeExpression) return () => subExpression;

    if (!isValidExpression(subExpression, operators)) {
      throw new Error(
        "objects passed as expressions must contain a single, valid expression; check the operators or wrap the object in $literal",
      );
    }

    const [operation, args] = Object.entries(subExpression)[0];
    const operator = operators[operation];

    return operator.compile(args, compile, context);
  };

  return compile(expression);
}

export function evaluateExpression(expression, operators, variables) {
  return compileExpression(expression, operators)(variables);
}
