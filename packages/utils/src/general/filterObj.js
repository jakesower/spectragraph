export function filterObj(obj, predicateFn) {
  const keys = Object.keys(obj);
  const output = {};
  const l = keys.length;

  for (let i = 0; i < l; i += 1) {
    const key = keys[i];
    if (predicateFn(obj[key]), key) {
      output[key] = obj[key];
    }
  }

  return output;
}
