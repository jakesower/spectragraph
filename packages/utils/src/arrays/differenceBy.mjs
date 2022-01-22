export function differenceBy(left, right, fn) {
  const rightSet = new Set(right.map(fn));
  return left.filter((leftElt) => !rightSet.has(fn(leftElt)));
}
