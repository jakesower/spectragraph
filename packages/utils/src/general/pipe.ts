export function pipe(fns: ((x: any) => any)[]): (x: any) => any {
  return fns.reduce(
    (acc, fn) => (val) => fn(acc(val)),
    (x) => x,
  )
}
