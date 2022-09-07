export function mapObj(obj, fn) {
  const keys = Object.keys(obj);
  const output = {};
  const l = keys.length;

  for (let i = 0; i < l; i += 1) {
    const val = obj[keys[i]];
    output[keys[i]] = fn(val, keys[i]);
  }

  return output;
}