export declare function filterT<T, U>(predicateFn: (val: T) => boolean): (val: T, next: (nextVal: T) => U) => U;
