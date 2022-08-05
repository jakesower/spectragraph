export function asArray(maybeArray) {
  return !maybeArray
    ? []
    : Array.isArray(maybeArray)
    ? [...maybeArray]
    : [maybeArray];
}

export function difference(left, right) {
  const rightSet = new Set(right);
  return left.filter((leftElt) => !rightSet.has(leftElt));
}

export function differenceBy(left, right, fn) {
  const rightSet = new Set(right.map(fn));
  return left.filter((leftElt) => !rightSet.has(fn(leftElt)));
}

export function intersection(leftArray, rightArray) {
  const output = [];
  const [smallerArray, largerArrayAsSet] =
    leftArray.length < rightArray.length
      ? [leftArray, new Set(rightArray)]
      : [rightArray, new Set(leftArray)];
  const l = smallerArray.length;

  for (let i = 0; i < l; i += 1) {
    const item = smallerArray[i];
    if (largerArrayAsSet.has(item)) {
      output[output.length] = item;
    }
  }

  return output;
}

export function intersperse(items, interItem) {
  if (items.length <= 1) return items;

  const output = [items[0]];
  for (let i = 1; i < items.length; i += 1) {
    output.push(interItem);
    output.push(items[i]);
  }

  return output;
}

export function groupBy(items, fn) {
  const out = {};
  const l = items.length;

  for (let i = 0; i < l; i += 1) {
    const group = fn(items[i]);
    out[group] = out[group] || [];
    out[group][out[group].length] = items[i];
  }

  return out;
}

export function keyBy(items, fn) {
  const output = {};
  const l = items.length;
  for (let i = 0; i < l; i += 1) {
    output[fn(items[i])] = items[i];
  }
  return output;
}

export function last(items) {
  return items[items.length - 1];
}

export function multiApply(itemItemsOrNull, fn) {
  if (itemItemsOrNull == null) return itemItemsOrNull;

  return Array.isArray(itemItemsOrNull)
    ? itemItemsOrNull.map(fn)
    : fn(itemItemsOrNull);
}

export function partition(items, predicateFn) {
  const l = items.length;
  let outTrue = [];
  let outFalse = [];

  for (let i = 0; i < l; i += 1) {
    if (predicateFn(items[i])) {
      outTrue[outTrue.length] = items[i];
    } else {
      outFalse[outFalse.length] = items[i];
    }
  }

  return [outTrue, outFalse];
}

export function reduceChunks(items, chunkSize, fn) {
  let out = items.slice(chunkSize);
  for (let i = chunkSize; i < items.length; i += chunkSize) {
    out = fn(out, items.slice(i, chunkSize + i));
  }

  return out;
}

export function reduceChunksWithInit(items, init, chunkSize, fn) {
  let out = init;
  for (let i = 0; i < items.length; i += chunkSize) {
    out = fn(out, items.slice(i, chunkSize + i));
  }

  return out;
}

export function reverse(items) {
  const output = [];

  for (let i = items.length - 1; i >= 0; i -= 1) {
    output.push(items[i]);
  }

  return output;
}

export function splitAt(items, idx) {
  return [items.slice(0, idx), items.slice(idx)];
}

export function takeWhile(items, predicateFn) {
  const output = [];

  for (let i = 0; i < items.length; i += 1) {
    if (predicateFn(items[i])) {
      output.push(items[i]);
    } else {
      return output;
    }
  }

  return output;
}

export function transpose(items) {
  const out = [[]];
  for (let i = 0; i < items.length; i += 1) {
    for (let j = 0; j < items[i].length; j += 1) {
      if (!out[j]) out[j] = [];
      out[j][i] = items[i][j];
    }
  }

  return out;
}

export function uniq(items) {
  return [...new Set(items)];
}

export function uniqBy(items, fn) {
  let hits = new Set();
  let out = [];

  for (const item of items) {
    const key = fn(item);
    if (!hits.has(key)) {
      hits.add(key);
      out[out.length] = item;
    }
  }

  return out;
}

export function zipObj(keys, vals) {
  return keys.reduce((out, key, idx) => {
    const o = { [key]: vals[idx] };
    return { ...out, ...o };
  }, {});
}

export function zipObjWith(keys, vals, fn) {
  return keys.reduce((out, key, idx) => {
    const o = { [key]: fn(vals[idx], key) };
    return { ...out, ...o };
  }, {});
}
