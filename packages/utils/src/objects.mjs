export { pick } from "./general/pick.mjs";

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

export function findObj(obj, predicateFn) {
  for (const key of Object.keys(obj)) {
    if (predicateFn(obj[key])) {
      return obj[key];
    }
  }

  return null;
}

export function filterObj(obj, predicateFn) {
  const keys = Object.keys(obj);
  const output = {};
  const l = keys.length;

  for (let i = 0; i < l; i += 1) {
    const key = keys[i];
    if (predicateFn(obj[key], key)) {
      output[key] = obj[key];
    }
  }

  return output;
}

export function forEachObj(obj, fn) {
  const keys = Object.keys(obj);
  const l = keys.length;

  for (let i = 0; i < l; i += 1) {
    const val = obj[keys[i]];
    fn(val, keys[i]);
  }
}

// e.g. {a: {inner: 'thing'}, b: {other: 'item'}} => {a: {key: 'a', inner: 'thing'}, b: {key: 'b', other: 'item'}}
export function inlineKey(obj, keyProp) {
  let result = {};
  const keys = Object.keys(obj);
  for (let key of keys) {
    result[key] = Object.assign({}, obj[key], { [keyProp]: key });
  }
  return result;
}

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

export function mapObjToArray(obj, fn) {
  const [keys, vals] = [Object.keys(obj), Object.values(obj)];
  const mappedVals = vals.map((v, idx) => fn(v, keys[idx]));
  return mappedVals;
}

export async function objPromise(obj) {
  const output = {};

  await Promise.all(
    Object.entries(obj).map(async ([key, val]) => {
      output[key] = await val;
    })
  );

  return output;
}

export function omit(obj, keys) {
  let out = { ...obj };
  for (let key of keys) {
    delete out[key];
  }
  return out;
}

export function partitionObj(obj, predicateFn) {
  const keys = Object.keys(obj);
  const l = keys.length;
  let outTrue = {};
  let outFalse = {};

  for (let i = 0; i < l; i += 1) {
    const [key, val] = [keys[i], obj[keys[i]]];

    if (predicateFn(val, key)) {
      outTrue[key] = val;
    } else {
      outFalse[key] = val;
    }
  }

  return [outTrue, outFalse];
}

export function withObj(obj, fn) {
  return Object.fromEntries(fn(Object.entries(obj)));
}
