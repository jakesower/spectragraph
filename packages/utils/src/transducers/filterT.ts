// import { Transducer } from "./transduce";

// export function filterT<T, U>(predicateFn: (val: T) => boolean): Transducer<T, T, U> {
//   return (val: T, next: (nextVal: T) => U[]): U[] => (
//     predicateFn(val) ? next(val) : []
//   );
// }
