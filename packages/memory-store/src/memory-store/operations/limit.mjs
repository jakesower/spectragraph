import { sortBy } from "@polygraph/utils";
import { reduceChunksWithInit, splitAt } from "@polygraph/utils/arrays";
import { orderFunction } from "./order.mjs";

export function limitOperation(resources, { query }) {
  const { limit, offset = 0 } = query;
  return resources.slice(offset, limit && limit + offset);
}

export function limitOrderOperation(resources, { orderingFunctions, query, schema }) {
  const { limit, offset = 0 } = query;
  const numRess = resources.length;

  const startChunkSize = limit ? limit + offset : numRess;
  const endChunkSize = numRess - offset;
  const shouldUseStart = startChunkSize <= endChunkSize;
  const chunkSize = Math.min(startChunkSize, endChunkSize);

  const fn = orderFunction({ orderingFunctions, query, schema });

  // no need to order items beyond the limit/offset threshold
  const [firstChunk, rest] = splitAt(resources, chunkSize);
  const init = sortBy(firstChunk, fn);

  if (chunkSize <= 0) return [];
  if (resources.length <= chunkSize) {
    const start = limit ?? 0;
    const toSort = offset > 0 ? resources.slice(start, offset) : resources.slice(start);
    return sortBy(toSort, fn);
  }

  // keep a cutoff of values that are too high to possibly be included and the values currently
  // meeting it, break the remaining stuff into filtered chunks and merge sort
  if (shouldUseStart) {
    const bestChunk = reduceChunksWithInit(rest, init, chunkSize, (best, curChunk) => {
      const curSorted = sortBy(curChunk, fn);
      const curLen = curSorted.length;
      const nextBest = [];
      let bestIdx = 0;
      let curIdx = 0;
      for (let i = 0; i < chunkSize; i += 1) {
        if (curIdx < curLen && fn(best[bestIdx], curSorted[curIdx]) > 0) {
          nextBest.push(curSorted[curIdx]);
          curIdx += 1;
        } else {
          nextBest.push(best[bestIdx]);
          bestIdx += 1;
        }
      }

      return nextBest;
    });

    return offset > 0 ? bestChunk.slice(offset) : bestChunk;
  }

  // go "backwards" and cut things off from the front
  const bestChunk = reduceChunksWithInit(rest, init, chunkSize, (best, curChunk) => {
    const curSorted = sortBy(curChunk, fn);
    const nextBest = [];
    let bestIdx = best.length - 1;
    let curIdx = curSorted.length - 1;
    for (let i = chunkSize - 1; i >= 0; i -= 1) {
      if (curIdx >= 0 && fn(best[bestIdx], curSorted[curIdx]) > 0) {
        nextBest[i] = best[bestIdx];
        bestIdx -= 1;
      } else {
        nextBest[i] = curSorted[curIdx];
        curIdx -= 1;
      }
    }

    return nextBest;
  });

  return limit ? bestChunk.slice(0, limit) : bestChunk;
}
