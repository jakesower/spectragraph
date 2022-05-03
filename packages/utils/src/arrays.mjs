export { difference } from "./arrays/difference.mjs";
export { differenceBy } from "./arrays/differenceBy.mjs";
export { intersection } from "./arrays/intersection.mjs";

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
