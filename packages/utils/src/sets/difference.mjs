export function difference(left, right) {
  return new Set(Array.from(left).filter((leftElt) => !right.has(leftElt)));
}
