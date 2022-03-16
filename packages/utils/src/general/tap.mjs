export function tap(fn) {
  return (val) => {
    fn(val);
    return val;
  }
}
