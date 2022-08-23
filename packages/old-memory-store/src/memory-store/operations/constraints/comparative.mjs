const compileComparitive = (predicate) => ({
  compile: (expression) => (value, field) => predicate(value[field], expression),
});

// TODO: optimize at least $in and $nin

export const $eq = compileComparitive((x, y) => x === y);
export const $gt = compileComparitive((x, y) => x > y);
export const $gte = compileComparitive((x, y) => x >= y);
export const $in = compileComparitive((input, expr) => expr.includes(input));
export const $lt = compileComparitive((x, y) => x < y);
export const $lte = compileComparitive((x, y) => x <= y);
export const $ne = compileComparitive((x, y) => x !== y);
export const $nin = compileComparitive((input, expr) => !expr.includes(input));
