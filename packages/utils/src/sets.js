// note that compareFn must be injective
export function combinations(left, right) {
  const leftArray = [...left];
  const rightArray = [...right];

  const leftOnly = new Set();
  const [numLeft, numRight] = [leftArray.length, rightArray.length];
  const rightOnly = new Set();
  const intersection = new Set();
  const union = new Set();

  for (let i = 0; i < numLeft; i += 1) {
    leftOnly.add(leftArray[i]);
    union.add(leftArray[i]);
  }

  for (let i = 0; i < numRight; i += 1) {
    const rightItem = rightArray[i];
    if (leftOnly.has(rightItem)) {
      leftOnly.delete(rightItem);
      intersection.add(rightItem);
    } else {
      rightOnly.add(rightItem);
      union.add(rightItem);
    }
  }

  return {
    left,
    right,
    leftOnly,
    rightOnly,
    intersection,
    union,
  };
}

// note that compareFn must be injective
export function combinationsBy(left, right, compareFn) {
  const leftOnlyMap = new Map();
  const [numLeft, numRight] = [left.length, right.length];
  const rightOnly = [];
  const intersection = [];
  const union = [];

  for (let i = 0; i < numLeft; i += 1) {
    leftOnlyMap.set(compareFn(left[i]), left[i]);
    union.push(left[i]);
  }

  for (let i = 0; i < numRight; i += 1) {
    const item = right[i];
    const rightComp = compareFn(item);
    if (leftOnlyMap.has(rightComp)) {
      leftOnlyMap.delete(rightComp);
      intersection.push(item);
    } else {
      rightOnly.push(item);
      union.push(item);
    }
  }

  return {
    left,
    right,
    leftOnly: Array.from(leftOnlyMap.values()),
    rightOnly,
    intersection,
    union,
  };
}

export function difference(left, right) {
  return new Set(Array.from(left).filter((leftElt) => !right.has(leftElt)));
}

export function equal(left, right) {
  return left.size === right.size && [...left].every((l) => right.has(l));
}

export function union(left, right) {
  return new Set([...[...left], [...right]]);
}
