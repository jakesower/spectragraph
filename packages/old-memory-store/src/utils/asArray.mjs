export function asArray(maybeArray) {
  return !maybeArray
    ? []
    : Array.isArray(maybeArray)
      ? [...maybeArray]
      : [maybeArray];
}
