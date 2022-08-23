export function multiApply(itemItemsOrNull, fn) {
  if (itemItemsOrNull == null) return itemItemsOrNull;

  return Array.isArray(itemItemsOrNull)
    ? itemItemsOrNull.map(fn)
    : fn(itemItemsOrNull);
}
