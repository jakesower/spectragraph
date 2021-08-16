export declare type Transducer<A, B, C, D> = (transducerFn: (val: A) => B) => (val: C, next: (nextVal: C) => D) => D;
export declare function transduce<A>(items: A[], transducers: any): any;
