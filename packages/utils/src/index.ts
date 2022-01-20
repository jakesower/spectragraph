import equals from 'deep-equal'
import { pipe } from './general/pipe';
// export * from './transducers'

export { equals };
export { objPromise } from "./general/objPromise";
export { pick } from "./general/pick";
export { pipe };
export { reverse } from "./general/reverse";

type Ord = number | string | boolean | Date

export function append<T, U>(xs: T[], ys: U[]): (T | U)[] {
  return [...xs, ...ys]
}

export function appendKeys<T, K extends keyof T>(
  base: { [k: string]: T[K][] },
  other: { [k: string]: T[K][] },
): { [k: string]: T[K][] } {
  const keys = uniq([...Object.keys(base), ...Object.keys(other)])

  let result = {}

  for (let key of keys) {
    result[key] = [...(base[key] || []), ...(other[key] || [])]
  }

  return result
}

export function applyOrMap<T, U>(valueOrArray: T[], fn: (item: T) => U): U[]
export function applyOrMap<T, U>(valueOrArray: T, fn: (item: T) => U): U
export function applyOrMap(valueOrArray, fn) {
  if (Array.isArray(valueOrArray)) {
    return valueOrArray.map(fn)
  }
  return fn(valueOrArray)
}

export function arraySetDifference<T>(xs: T[], ys: T[]): T[] {
  const ySet = new Set(ys)
  return xs.filter((x) => !ySet.has(x))
}

export function arraySetDifferenceBy<T, U>(
  xs: T[],
  ys: T[],
  fn: (val: T) => U,
): T[] {
  const ySet = new Set(ys.map(fn))
  return xs.filter((x) => !ySet.has(fn(x)))
}

export function arrayUnion<T, U>(xs: T[], ys: U[]): (T | U)[] {
  return [...new Set([].concat(xs, ys))]
}


export function assignChildren(
  objs: { [k: string]: { [k: string]: any } }[],
): { [k: string]: { [k: string]: any } } {
  let out = {}

  objs.forEach((obj) => {
    for (let k of Object.keys(obj)) {
      out[k] = obj[k]
    }
  })
  return out
}

export function chainPipeThru(val: any, fns: ((x: any) => any)[]) {
  return fns.reduce((acc, fn) => acc.chain(fn), val)
}

export function cmp(a: Ord, b: Ord): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function deepClone<T>(obj: T): T {
  if (!obj) {
    return obj
  }

  let out = (Array.isArray(obj) ? [] : {}) as T
  for (const key in obj) {
    const val = obj[key]
    out[key] = typeof val === 'object' ? deepClone(val) : val
  }

  return out as T
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

export function fillObject<T>(keys: string[], value: T): { [k: string]: T } {
  const l = keys.length
  let out = {}

  for (let i = 0; i < l; i += 1) {
    out[keys[i]] = value
  }

  return out
}

export function filterObj<T extends Record<string, any>>(
  obj: T,
  fn: (val: T[keyof T], key: keyof T & string) => boolean
): Partial<T> {
  const keys = Object.keys(obj);
  const output = {} as Record<any, any>;
  const l = keys.length;

  for (let i = 0; i < l; i += 1) {
    const val = obj[keys[i]];
    if (fn(val, keys[i] as keyof T & string)) {
      output[keys[i]] = val;
    }
  }

  return output as Partial<T>;
}

export function findObj<T>(
  obj: { [k: string]: T },
  predicateFn: (x: T) => boolean,
): T | null {
  for (const key of Object.keys(obj)) {
    if (predicateFn(obj[key])) {
      return obj[key]
    }
  }

  return null
}

export function flatMap<T>(xs: T[], fn: (x: T) => T[]): T[] {
  return makeFlat(xs.map(fn), false)
}

export function forEachObj<T extends Record<string, any>>(
  obj: T,
  fn: (val: T[keyof T], key: keyof T & string) => any
): void {
  const keys = Object.keys(obj);
  const l = keys.length;

  for (let i = 0; i < l; i += 1) {
    const val = obj[keys[i]];
    fn(val, keys[i] as keyof T & string);
  }
}

export function flatten<T>(xs: T[][]): T[] {
  return makeFlat(xs, true)
}

export function groupBy<T>(
  items: T[],
  fn: (item: T) => string,
): { [k: string]: T[] } {
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
export function inlineKey<T extends Record<string, Record<string, any>>, K extends string>(
  obj: T,
  keyProp: K
): { [P in keyof T]: T[P] & { [k in K]: string } } {
  let result = {}
  const keys = Object.keys(obj)
  for (let key of keys) {
    result[key] = Object.assign({}, obj[key], { [keyProp]: key })
  }
  return result as { [P in keyof T]: T[P] & { [k in K]: string } };
}

export function keyBy<T>(items: T[], fn: (item: T) => string): Record<string, T> {
  const output = {};
  const l = items.length;
  for (let i = 0; i < l; i += 1) {
    output[fn(items[i])] = items[i];
  }
  return output;
}

export function keyByProp<T, K extends keyof T>(items: T[], key: K): Record<K, T> {
  const output = {} as Record<K, T>;
  const l = items.length;
  for (let i = 0; i < l; i += 1) {
    output[key] = items[i];
  }
  return output;
}

export function mapObj<T extends Record<string, any>, U>(
  obj: T,
  fn: (val: T[keyof T], key: keyof T & string) => U
): { [K in keyof T]: U } {
  const keys = Object.keys(obj);
  const output = {} as Record<any, any>;
  const l = keys.length;

  for (let i = 0; i < l; i += 1) {
    const val = obj[keys[i]];
    output[keys[i]] = fn(val, keys[i] as keyof T & string);
  }

  return output as { [K in keyof T]: U };
}

export function mapObjToArray<T, U>(
  obj: { [k in string]: T },
  fn: (x: T, idx: string) => U,
): U[] {
  const [keys, vals] = [Object.keys(obj), Object.values(obj)]
  const mappedVals = vals.map((v, idx) => fn(v, keys[idx]))
  return mappedVals
}

export function maxStable<T>(fn: (a: T) => Ord, xs: T[]): T {
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

export function mergeAll<T>(
  items: { [k in string]: T }[],
): { [k in string]: T } {
  const init: { [k in string]: T } = {}
  return items.reduce((merged, arg) => ({ ...merged, ...arg }), init)
}

export function mergeChildren(
  obj: { [k: string]: { [k: string]: any } },
  ext: { [k: string]: { [k: string]: any } },
): { [k: string]: { [k: string]: any } } {
  const ks = uniq([...Object.keys(obj), ...Object.keys(ext)])
  const l = ks.length

  let out = {}
  for (let i = 0; i < l; i += 1) {
    out[ks[i]] = { ...(obj[ks[i]] || {}), ...(ext[ks[i]] || {}) }
  }
  return out
}

export function mergeWith<T, U, V>(
  base: { [k: string]: T },
  other: { [k: string]: U },
  combiner: (x: T, y: U) => V,
): { [k: string]: T | U | V } {
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

export function omit<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
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

export function partition<T>(
  items: T[],
  predicateFn: (val: T) => boolean,
): [T[], T[]] {
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

export function pipeThru(val: any, fns: ((x: any) => any)[]): any {
  return pipe(fns)(val)
}

export function pluckKeys<T>(
  obj: { [k: string]: T },
  keep: string[],
): { [k: string]: T } {
  let out = {}
  for (let key of keep) {
    if (key in obj) {
      out[key] = obj[key]
    }
  }
  return out
}

export function reduceObj<T, U>(
  obj: { [k: string]: T },
  init: U,
  reducer: (acc: U, v: T, k: string) => U,
): U {
  return Object.keys(obj).reduce(
    (acc, key) => reducer(acc, obj[key], key),
    init,
  )
}

export function sortBy<T>(fn: (a: T, b: T) => number, xs: T[]): T[] {
  if (xs.length === 0) {
    return []
  }
  const first = xs[0]
  const rest = xs.slice(1)
  let lts: T[] = []
  let gts: T[] = []
  let eqs: T[] = [first]
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

export function sortByAll<T>(fns: ((a: T, b: T) => number)[], xs: T[]): T[] {
  if (fns.length === 0 || xs.length <= 1) {
    return xs
  }

  const [fn, ...restFns] = fns
  const [first, ...rest] = xs

  let lts: T[] = []
  let gts: T[] = []
  let eqs: T[] = [first]
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

export function sortWith<T>(fn: (a: T) => Ord, xs: T[]): T[] {
  if (xs.length === 0) {
    return []
  }
  const first = xs[0]
  const fx = fn(first)
  const rest = xs.slice(1)
  let lts: T[] = []
  let gts: T[] = []
  let eqs: T[] = [first]
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

export function sortWithAll<T>(fns: ((a: T) => Ord)[], xs: T[]): T[] {
  if (fns.length === 0 || xs.length <= 1) {
    return xs
  }

  const fn = fns[0]
  const restFns = fns.slice(1)
  const first = xs[0]
  const fx = fn(first)
  const rest = xs.slice(1)
  let lts: T[] = []
  let gts: T[] = []
  let eqs: T[] = [first]
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

export function uniq<T>(xs: T[]): T[] {
  return [...new Set(xs)]
}

export function uniqBy<T>(xs: T[], fn: (x: T) => Ord): T[] {
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

export function union<T>(left: Set<T>, right: Set<T>): Set<T> {
  return new Set([...left, ...right])
}

export function unnest<T>(xs: T[][]): T[] {
  return makeFlat(xs, false)
}

export function xprod<T, U>(xs: T[], ys: U[]): [T, U][] {
  const xl = xs.length
  const yl = ys.length
  let out: [T, U][] = []

  for (let i = 0; i < xl; i += 1) {
    for (let j = 0; j < yl; j += 1) {
      out[out.length] = [xs[i], ys[j]]
    }
  }

  return out
}

export function zipObj<T>(keys: string[], vals: T[]): { [k: string]: T } {
  return keys.reduce((out, key, idx) => {
    const o = { [key]: vals[idx] }
    return { ...out, ...o }
  }, {})
}

function makeFlat<T>(list, recursive): T[] {
  let result: T[] = []
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
