export function difference<T>(left: T[], right: T[]): T[] {
  const rightSet = new Set(right);
  return left.filter((leftElt) => !rightSet.has(leftElt));
}
