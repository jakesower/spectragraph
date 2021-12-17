import { reverse } from './reverse';

function go<T>(short: T[], long: Set<T>) {
  const shortOnly = [];
  const both = [];
  const l = short.length;

  for (let i = 0; i < l; i += 1) {
    const item = short[i];
    if (long.has(item)) {
      both[both.length] = item;
      long.delete(item);
    } else {
      shortOnly[shortOnly.length] = item;
    }
  }

  return [shortOnly, both, Array.from(long)];
}

export function trisect<T>(left: T[], right: T[]) {
  return (left.length < right.length)
    ? go(left, new Set(right))
    : reverse(go(right, new Set(left)));
}
