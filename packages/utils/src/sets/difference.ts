export function difference<T>(left: Set<T>, right: Set<T>): Set<T> {
  return new Set(Array.from(left).filter((leftElt) => !right.has(leftElt)));
}
