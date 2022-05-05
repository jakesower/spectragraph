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

export function last(items) {
  return items[items.length - 1];
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

export function splitAt(items, idx) {
  return [items.slice(0, idx), items.slice(idx)];
}
