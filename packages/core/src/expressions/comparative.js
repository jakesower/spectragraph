import { deepEqual } from "@taxonic/utils/generics";

const compileComparative = (predicate) => ({
  compile: (exprVal, context) => (runVal) => {
    const [left, right] = exprVal.map((expr) => context.runExpression(expr, runVal));
    return predicate(left, right);
  },
});

// TODO: optimize at least $in and $nin

export const $eq = compileComparative(deepEqual);
export const $gt = compileComparative((x, y) => x > y);
export const $gte = compileComparative((x, y) => x >= y);
export const $in = compileComparative((input, expr) => expr.includes(input));
export const $lt = compileComparative((x, y) => x < y);
export const $lte = compileComparative((x, y) => x <= y);
export const $ne = compileComparative((x, y) => x !== y);
export const $nin = compileComparative((input, expr) => !expr.includes(input));
