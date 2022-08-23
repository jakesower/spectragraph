export function multiApplyArray(itemItemsOrNull, fn) {
  if (Array.isArray(itemItemsOrNull)) {
    return fn(itemItemsOrNull);
  }

  const result = fn(itemItemsOrNull == null
    ? []
    : [itemItemsOrNull]);

  return result === [] ? null : result;
}
