export function mapMap(map, fn) {
  const keys = map.keys();
  const output = new Map();
  const l = keys.length;

  for (let i = 0; i < l; i += 1) {
    const key = keys[i];
    const val = map.get(key);

    output.set(key, fn(val, key));
  }

  return output;
}
