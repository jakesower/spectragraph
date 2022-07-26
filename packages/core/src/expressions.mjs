/* eslint-disable import/no-cycle */
import { $eq, $gt, $gte, $in, $lt, $lte, $ne, $nin } from "./expressions/comparative.mjs";
import { $and } from "./expressions/logical.mjs";

export const $const = { compile: (exprVal) => () => exprVal };
export const $prop = { compile: (exprVal) => (runVal) => runVal[exprVal] };

export const coreExpressions = {
  // core
  $const,
  $prop,
  // comparative
  $eq,
  $gt,
  $gte,
  $in,
  $lt,
  $lte,
  $ne,
  $nin,
  // logical
  $and,
};

export const makeIsExpression = (expressionDefs) => (value) =>
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).length === 1 &&
  Object.keys(value)[0] in expressionDefs;

// lots of opportunity for optimization here
export function compileExpression(expressionDefs, expressionOrConst, userContext = {}) {
  const isExpression = makeIsExpression(expressionDefs);

  const run = (subExpr, subVal) => {
    if (!isExpression(subExpr)) return subExpr;

    const context = { ...userContext, runExpression: run };
    const [expressionKey, expressionValue] = Object.entries(subExpr)[0];

    return expressionDefs[expressionKey].compile(expressionValue, context)(subVal);
  };

  return (rootVal) => run(expressionOrConst, rootVal);
}
