export function reverse(items) {
  const output = [];

  for (let i = (items.length - 1); i >= 0; i -= 1) {
    output.push(items[i]);
  }

  return output;
};
