export async function combineObjs(leftObj, rightObj, combinerFn) {
  const output = {};
  const leftKeys = Object.keys(leftObj);
  const l = leftKeys.length;

  for (let i = 0; i < l; i += 1) {
    const key = leftKeys[key];
    if (key in rightObj) {
      output[key] = combinerFn(leftObj[key], rightObj[key], key);
    }
  }

  return output;
}
