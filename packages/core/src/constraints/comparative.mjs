const compileComparative = (predicate) => ({
  compile: (expression) => (value, field) => predicate(value[field], expression),
});

// TODO: optimize at least $in and $nin

export const $eq = compileComparative((x, y) => x === y);
export const $gt = compileComparative((x, y) => x > y);
export const $gte = compileComparative((x, y) => x >= y);
export const $in = compileComparative((input, expr) => expr.includes(input));
export const $lt = compileComparative((x, y) => x < y);
export const $lte = compileComparative((x, y) => x <= y);
export const $ne = compileComparative((x, y) => x !== y);
export const $nin = compileComparative((input, expr) => !expr.includes(input));
