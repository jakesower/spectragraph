export function multiApply(itemItemsOrNull, fn) {
  if (itemItemsOrNull == null) return itemItemsOrNull;

  return Array.isArray(itemItemsOrNull)
    ? itemItemsOrNull.map(fn)
    : fn(itemItemsOrNull);
}

export function multiApplyAsync(itemItemsOrNull, fn) {
  if (itemItemsOrNull == null) return Promise.resolve(itemItemsOrNull);

  return Array.isArray(itemItemsOrNull)
    ? Promise.all(itemItemsOrNull.map(fn))
    : fn(itemItemsOrNull);
}

export function pipe(fns) {
  return fns.reduce(
    (acc, fn) => (val) => fn(acc(val)),
    (x) => x
  );
}

export function pipeThru(val, fns) {
  return pipe(fns)(val);
}
