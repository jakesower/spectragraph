export function differenceBy<T, C>(left: T[], right: T[], fn: (item: T) => C): T[] {
  const rightSet = new Set(right.map(fn));
  return left.filter((leftElt) => !rightSet.has(fn(leftElt)));
}
