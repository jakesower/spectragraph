export function pipeWithContext(fns, context) {
  return fns.reduce(
    (acc, fn) => (val) => fn(acc(val), context),
    (x) => x,
  )
}
