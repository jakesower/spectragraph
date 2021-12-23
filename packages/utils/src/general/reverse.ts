export function reverse<T>(items: Readonly<T[]>): Readonly<T[]> {
  const output = [];

  for (let i = (items.length - 1); i >= 0; i -= 1) {
    output.push(items[i]);
  }

  return output;
};
