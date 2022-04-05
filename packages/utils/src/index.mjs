import equals from 'deep-equal'
import { pipe } from './general/pipe.mjs';
// export * from './transducers'

export { combineObjs } from "./general/combineObjs.mjs";
export { equals };
export { filterObj } from "./general/filterObj.mjs";
export { objPromise } from "./general/objPromise.mjs";
export { pick } from "./general/pick.mjs";
export { pipe };
export { pipeThruMiddleware, pipeThruMiddlewareDebug } from  "./general/pipeThruMiddleware.mjs";
export { pipeWithContext } from "./general/pipeWithContext.mjs";
export { reverse } from "./general/reverse.mjs";
export { tap } from "./general/tap.mjs";

export function appendKeys(base,other,) {
  const keys = uniq([...Object.keys(base), ...Object.keys(other)])

  let result = {}

  for (let key of keys) {
    result[key] = [...(base[key] || []), ...(other[key] || [])]
  }

  return result
}

export function applyOrMap(valueOrArray, fn) {
  if (Array.isArray(valueOrArray)) {
    return valueOrArray.map(fn)
  }
  return fn(valueOrArray)
}

export function arraySetDifference(xs, ys) {
  const ySet = new Set(ys)
  return xs.filter((x) => !ySet.has(x))
}

export function arraySetDifferenceBy(xs, ys, fn,) {
  const ySet = new Set(ys.map(fn))
  return xs.filter((x) => !ySet.has(fn(x)))
}

export function arrayUnion(xs, ys) {
  return [...new Set([].concat(xs, ys))]
}


export function assignChildren(objs,) {
  let out = {}

  objs.forEach((obj) => {
    for (let k of Object.keys(obj)) {
      out[k] = obj[k]
    }
  })
  return out
}

export function chainPipeThru(val, fns) {
  return fns.reduce((acc, fn) => acc.chain(fn), val)
}

export function cmp(a, b) {
  return a < b ? -1 : a > b ? 1 : 0
}

export function deepClone(obj) {
  if (!obj) {
    return obj
  }

  let out = (Array.isArray(obj) ? [] : {})
  for (const key in obj) {
    const val = obj[key]
    out[key] = typeof val === 'object' ? deepClone(val) : val
  }

  return out
}

export function fgo(generator) {
  const recur = ({ value, done }, gen) => {
    if (done) {
      return value
    }
    return value.chain((v) => recur(gen.next(v), gen))
  }

  let g = generator()
  return recur(g.next(), g)
}

export function fillObject(keys, value) {
  const l = keys.length
  let out = {}

  for (let i = 0; i < l; i += 1) {
    out[keys[i]] = value
  }

  return out
}

export function findObj(obj,predicateFn) {
  for (const key of Object.keys(obj)) {
    if (predicateFn(obj[key])) {
      return obj[key]
    }
  }

  return null
}

export function flatMap(xs, fn) {
  return makeFlat(xs.map(fn), false)
}

export function forEachObj(obj, fn) {
  const keys = Object.keys(obj);
  const l = keys.length;

  for (let i = 0; i < l; i += 1) {
    const val = obj[keys[i]];
    fn(val, keys[i]);
  }
}

export function flatten(xs) {
  return makeFlat(xs, true)
}

export function groupBy(items, fn) {
  const out = {}
  const l = items.length

  for (let i = 0; i < l; i += 1) {
    const group = fn(items[i])
    out[group] = out[group] || []
    out[group][out[group].length] = items[i]
  }

  return out
}

export function indexOn(xs, keys) {
  let out = {}
  const [first, ...rest] = keys

  if (rest.length === 0) {
    for (let x of xs) {
      out[x[first]] = x
    }

    return out
  }

  for (let x of xs) {
    const k = x[first]
    out[k] = out[k] || []
    out[k][out[k].length] = x
  }

  return mapObj(out, (ys) => indexOn(ys, rest))
}

// e.g. {a: {inner: 'thing'}, b: {other: 'item'}} => {a: {key: 'a', inner: 'thing'}, b: {key: 'b', other: 'item'}}
export function inlineKey(obj, keyProp) {
  let result = {}
  const keys = Object.keys(obj)
  for (let key of keys) {
    result[key] = Object.assign({}, obj[key], { [keyProp]: key })
  }
  return result;
}

export function keyBy(items, fn) {
  const output = {};
  const l = items.length;
  for (let i = 0; i < l; i += 1) {
    output[fn(items[i])] = items[i];
  }
  return output;
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
  const [keys, vals] = [Object.keys(obj), Object.values(obj)]
  const mappedVals = vals.map((v, idx) => fn(v, keys[idx]))
  return mappedVals
}

export function maxStable(fn, xs) {
  const l = xs.length
  let out = xs[0]
  let outVal = fn(out)

  for (let i = 1; i < l; i += 1) {
    const cur = xs[i]
    const curVal = fn(cur)

    if (curVal > outVal) {
      out = cur
      outVal = curVal
    }
  }

  return out
}

export function mapResult(resultOrResults, fn) {
  if (resultOrResults === null) {
    return null
  }

  if (Array.isArray(resultOrResults)) {
    return resultOrResults.map((r) => mapResult(r, fn))
  }

  const next = fn(resultOrResults)
  const relationships = mapObj(resultOrResults.relationships, (r) =>
    mapResult(r, fn),
  )

  return { ...next, relationships }
}

export function mergeAll(items) {
  const init = {}
  return items.reduce((merged, arg) => ({ ...merged, ...arg }), init)
}

export function mergeChildren(obj, ext) {
  const ks = uniq([...Object.keys(obj), ...Object.keys(ext)])
  const l = ks.length

  let out = {}
  for (let i = 0; i < l; i += 1) {
    out[ks[i]] = { ...(obj[ks[i]] || {}), ...(ext[ks[i]] || {}) }
  }
  return out
}

export function mergeWith(base, other, combiner) {
  const keys = uniq([...Object.keys(base), ...Object.keys(other)])

  let result = {}

  for (let key of keys) {
    result[key] = !(key in base)
      ? other[key]
      : !(key in other)
      ? base[key]
      : combiner(base[key], other[key])
  }

  return result
}

export function overPath(obj, path, fn) {
  if (path.length === 0) {
    return null
  }

  const [head, ...tail] = path

  if (path.length === 1) {
    return {
      ...obj,
      [head]: fn(obj[head]),
    }
  }

  return {
    ...obj,
    [head]: overPath(obj[head], tail, fn),
  }
}

export function omit(obj, keys) {
  let out = { ...obj }
  for (let key of keys) {
    delete out[key]
  }
  return out
}

export function parseQueryParams(rawParams) {
  let out = {}

  const indexRegex = /^([^[]+)\[([^\]]+)\]$/
  Object.keys(rawParams).forEach((k) => {
    const res = indexRegex.exec(k)

    if (res) {
      const [top, inner] = [res[1], res[2]]
      out[top] = out[top] || {}
      out[top][inner] = rawParams[k]
    } else {
      out[k] = rawParams[k]
    }
  })

  return out
}

export function partition(items, predicateFn) {
  const l = items.length
  let outTrue = []
  let outFalse = []

  for (let i = 0; i < l; i += 1) {
    if (predicateFn(items[i])) {
      outTrue[outTrue.length] = items[i]
    } else {
      outFalse[outFalse.length] = items[i]
    }
  }

  return [outTrue, outFalse]
}

export function pathOr(obj, path, otherwise) {
  if (path.length === 0) return true

  const [first, ...rest] = path

  return first in obj ? pathOr(obj[first], rest, otherwise) : otherwise
}

export async function pipeMw(init, mws) {
  if (mws.length === 0) {
    return init
  }

  const fn = mws.reverse().reduce((onion, mw) => {
    return async (req) => await mw(req, onion)
  })

  return fn(init)
}

export function pipeThru(val, fns) {
  return pipe(fns)(val)
}

export function pluckKeys(obj, keep) {
  let out = {}
  for (let key of keep) {
    if (key in obj) {
      out[key] = obj[key]
    }
  }
  return out
}

export function reduceObj(obj, init, reducer) {
  return Object.keys(obj).reduce(
    (acc, key) => reducer(acc, obj[key], key),
    init,
  )
}

export function sortBy(xs, fn) {
  if (xs.length === 0) {
    return []
  }
  const first = xs[0]
  const rest = xs.slice(1)
  let lts = []
  let gts = []
  let eqs = [first]
  for (let i = 0; i < rest.length; i += 1) {
    const comp = fn(rest[i], first)

    if (comp > 0) {
      gts.push(rest[i])
    } else if (comp === 0) {
      eqs.push(rest[i])
    } else {
      lts.push(rest[i])
    }
  }

  return sortBy(fn, lts).concat(eqs).concat(sortBy(fn, gts))
}

export function sortByAll(xs, fns) {
  if (fns.length === 0 || xs.length <= 1) {
    return xs
  }

  const [fn, ...restFns] = fns
  const [first, ...rest] = xs

  let lts = []
  let gts = []
  let eqs = [first]
  for (let i = 0; i < rest.length; i += 1) {
    const comp = fn(rest[i], first)

    if (comp > 0) {
      gts.push(rest[i])
    } else if (comp === 0) {
      eqs.push(rest[i])
    } else {
      lts.push(rest[i])
    }
  }

  return [
    ...sortByAll(fns, lts),
    ...sortByAll(restFns, eqs),
    ...sortByAll(fns, gts),
  ]
}

export function sortWith(fn, xs) {
  if (xs.length === 0) {
    return []
  }
  const first = xs[0]
  const fx = fn(first)
  const rest = xs.slice(1)
  let lts = []
  let gts = []
  let eqs = [first]
  for (let i = 0; i < rest.length; i += 1) {
    const fy = fn(rest[i])

    if (fy > fx) {
      gts.push(rest[i])
    } else if (fy < fx) {
      lts.push(rest[i])
    } else {
      eqs.push(rest[i])
    }
  }

  return sortWith(fn, lts).concat(eqs).concat(sortWith(fn, gts))
}

export function sortWithAll(xs, fns) {
  if (fns.length === 0 || xs.length <= 1) {
    return xs
  }

  const fn = fns[0]
  const restFns = fns.slice(1)
  const first = xs[0]
  const fx = fn(first)
  const rest = xs.slice(1)
  let lts = []
  let gts = []
  let eqs = [first]
  for (let i = 0; i < rest.length; i += 1) {
    // TODO: reduce this over fns (start with 0, exit on non-zero)
    const fy = fn(rest[i])

    if (fy > fx) {
      gts.push(rest[i])
    } else if (fy < fx) {
      lts.push(rest[i])
    } else {
      eqs.push(rest[i])
    }
  }

  return [
    ...sortWithAll(fns, lts),
    ...sortWithAll(restFns, eqs),
    ...sortWithAll(fns, gts),
  ]
}

export function uniq(xs) {
  return [...new Set(xs)]
}

export function uniqBy(xs, fn) {
  let hits = new Set()
  let out = []

  for (const x of xs) {
    const key = fn(x)
    if (!hits.has(key)) {
      hits.add(key)
      out[out.length] = x
    }
  }

  return out
}

export function union(left, right) {
  return new Set([...left, ...right])
}

export function unnest(xs) {
  return makeFlat(xs, false)
}

export function xprod(xs, ys) {
  const xl = xs.length
  const yl = ys.length
  let out = []

  for (let i = 0; i < xl; i += 1) {
    for (let j = 0; j < yl; j += 1) {
      out[out.length] = [xs[i], ys[j]]
    }
  }

  return out
}

export function zipObj(keys, vals) {
  return keys.reduce((out, key, idx) => {
    const o = { [key]: vals[idx] }
    return { ...out, ...o }
  }, {})
}

function makeFlat(list, recursive) {
  let result = []
  let idx = 0
  let ilen = list.length

  while (idx < ilen) {
    if (Array.isArray(list[idx])) {
      let value = recursive ? makeFlat(list[idx], true) : list[idx]
      let j = 0
      let jlen = value.length
      while (j < jlen) {
        result[result.length] = value[j]
        j += 1
      }
    } else {
      result[result.length] = list[idx]
    }
    idx += 1
  }

  return result
}
