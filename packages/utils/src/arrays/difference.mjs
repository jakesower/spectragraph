export function difference(left, right) {
  const rightSet = new Set(right);
  return left.filter((leftElt) => !rightSet.has(leftElt));
}
