import { constraintDefinitions } from "./constraints/constraint-definitions.mjs";

export const isExpression = (value) => typeof value === "object" && !Array.isArray(value);
export const isPropLookupExpression = (value) => typeof value === "object";

// This compiles arguments, be they expressions or constants.
export function compileArg(constraintOrConst) {
  if (isExpression(constraintOrConst)) {
    const expressionKey = Object.keys(constraintOrConst)[0];
    const expressionValue = constraintOrConst[expressionKey];

    return compileExpression(expressionKey, expressionValue);
  }

  // how to do this?? it'd be dandy to simply have field lookups in the
  // `constraintDefinitions` or composed object
  // e.g. moo = { ...constraintDefinitions, ...resFieldLookups }
  if (isPropLookupExpression(constraintOrConst)) {
    return compileArg();
  }

  return constraintOrConst;
}

// Takes a known expression and turns it into a function that knows how to take
// a resource and (optionally) a field and produces a result based on the
// expression's operation. This includes evaluation of nested expressions.
export function compileExpression(expressionKey, expressionArg) {
  const { compile } = constraintDefinitions[expressionKey];
  return compile(expressionArg);
}
