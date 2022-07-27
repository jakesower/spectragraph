import { mapObj } from "./general/mapObj.mjs";

export const EACH = Symbol("lens-each");

export function lensPath(path) {
  return {
    delete: (arrayOrObj) => deletePath(arrayOrObj, path),
    focus: (innerPath) => lensPath([...path, ...innerPath]),
    get: (arrayOrObj) => getPath(arrayOrObj, path),
    over: (arrayOrObj, fn) => overPath(arrayOrObj, path, fn),
    set: (arrayOrObj, val) => setPath(arrayOrObj, path, val),
  };
}

export function deletePath(objOrArray, path) {
  const [head, ...tail] = path;
  return tail.length === 0
    ? omit(objOrArray, path)
    : { ...objOrArray, [head]: deletePath(objOrArray[head], tail) };
}

export function getPath(objOrArray, path) {
  const [head, ...tail] = path;
  return path.length === 0 ? objOrArray : getPath(objOrArray[head], tail);
}

export function isPathDefined(objOrArray, path) {
  if (path.length === 0) return objOrArray === undefined;

  const [head, ...tail] = path;
  return head in objOrArray ? isPathDefined(objOrArray[head], tail) : false;
}

export function overPath(objOrArray, path, fn) {
  if (path.length === 0) {
    return null;
  }

  const [head, ...tail] = path;
  if (path.length === 1) {
    return {
      ...objOrArray,
      [head]: fn(objOrArray[head]),
    };
  }

  return {
    ...objOrArray,
    [head]: overPath(objOrArray[head], tail, fn),
  };
}

// export function overEachExistingPath(objOrArray, path, fn) {
//   if (path.length === 0) {
//     return null;
//   }

//   const [head, ...tail] = path;
//   if (path.length === 1) {
//     if (head !== EACH) {
//       return {
//         ...objOrArray,
//         [head]: fn(objOrArray[head]),
//       };
//     }

//     return Array.isArray(objOrArray)
//       ? objOrArray.map(fn)
//       : mapObj(objOrArray, fn);
//   }

//   return head === EACH
//     ? Array.isArray(objOrArray)
//       ? objOrArray.map((val) => overEachPath(val, tail, fn))
//       : mapObj(objOrArray, (val) => overEachPath(val, tail, fn))
//     : {
//         ...objOrArray,
//         [head]: overEachPath(objOrArray[head], tail, fn),
//       };
// }

export function overEachPath(objOrArray, path, fn) {
  if (path.length === 0) {
    return null;
  }

  const [head, ...tail] = path;
  if (path.length === 1) {
    if (head !== EACH) {
      return {
        ...objOrArray,
        [head]: fn(objOrArray[head]),
      };
    }

    return Array.isArray(objOrArray)
      ? objOrArray.map(fn)
      : mapObj(objOrArray, fn);
  }

  return head === EACH
    ? Array.isArray(objOrArray)
      ? objOrArray.map((val) => overEachPath(val, tail, fn))
      : mapObj(objOrArray, (val) => overEachPath(val, tail, fn))
    : {
        ...objOrArray,
        [head]: overEachPath(objOrArray[head], tail, fn),
      };
}

export function setPath(objOrArray, path, val) {
  const go = (nested, subPath) => {
    const [head, ...tail] = subPath;
    return head ? { ...nested, [head]: go(nested[head], tail) } : val;
  };

  return go(objOrArray, path);
}
