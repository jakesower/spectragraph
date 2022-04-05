import { constraintDefinitions } from "./constraints/constraint-definitions.mjs";

export const isExpression = (value) => typeof value === "object" && !Array.isArray(value);

// This compiles arguments, be they expressions or constants.
export function compileArg(constraintOrConst) {
  if (!isExpression) return () => constraintOrConst;

  const expressionKey = Object.keys(constraintOrConst)[0];
  const expressionValue = constraintOrConst[expressionKey];

  return compileExpression(expressionKey, expressionValue);
}

// Takes a known expression and turns it into a function that knows how to take
// a resource and (optionally) a field and produces a result based on the
// expression's operation. This includes evaluation of nested expressions.
export function compileExpression(expressionKey, expressionValue) {
  const compiledArg = isExpression(expressionValue)
    ? compileExpression(expressionValue)
    : expressionValue;
  const { apply } = constraintDefinitions[expressionKey];

  return (resource, field) => apply({
    resource,
    field,
    value: resource?.[field],
    arg: compiledArg,
  });
}
