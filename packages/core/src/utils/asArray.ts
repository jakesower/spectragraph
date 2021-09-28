export function asArray<T>(maybeArray: null | T | T[]): T[] {
  return !maybeArray
    ? []
    : Array.isArray(maybeArray)
      ? [...maybeArray]
      : [maybeArray];
}
