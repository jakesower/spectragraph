// // export type Transducer<A, B, C> = (transducerFn: (val: A) => B) => (val: A, next: (nextVal: B) => C) => C;
// // export type Transducer<A, B, C> = (transducerFn: (val: A) => B) => (val: A, next: (nextVal: B) => C) => C;
// export type Transducer<Input, NextArg, Return> = (val: Input, next: (nextVal: NextArg) => Return[]) => Return[];
// // export function transduce<A, B, C, D>(items: A[], transducers: Transducer<any, any, any, any>[]): any {
// // export function transduce<A, B, C>(items: A[], []): A[]
// // export function transduce<A, B, C>(items: A[], transducers: [Transducer<A, B, C>]): C[]
// // export function transduce<A, B, C, D, E>(items: A[], transducers: [Transducer<A, B, C>, Transducer<B, D, E]>): E[]
// // export function transduce<A, B, C>(items: A[], transducers: unknown[]): unknown[] {
// // type TransducerPipe<T, A1> = T extends (items: (infer A)[], transducers: []) => any[]
// //   ? A[]
// //   : T extends (items: any[], transducers: [Transducer<any, any, infer C>]) => any[]
// //   ? C[]
// //   // : T extends <A, B, C, D, E>(items: (infer A)[], transducers: [Transducer<A, B, C>, Transducer<B, D, E>]) => (infer E)[]
// //   // ? E[]
// //   // : T extends (items: (infer A1)[], transducers: [Transducer<infer A1, infer B1, infer C1>, Transducer<infer B1, infer B2, infer C2>, Transducer<infer B2, infer B3, infer C3>]) => (infer C3)[]
// //   // ? C3[]
// //   : never
// //   // : unknown[];
// // type T1 = TransducerPipe<(items: boolean[], transducers: []) => any>
// // type T2 = TransducerPipe<(items: number[], transducers: [Transducer<string, string, boolean>]) => any[]>
// // type T3 = TransducerPipe<(items: string[], transducers: [Transducer<string, number, number>, Transducer<number, null, boolean>]) => any>
// type TU = (<A>(items: A[], transducers: any[]) => A[])
//   | (<A, B, C>(items: A[], transducers: [Transducer<A, B, C>]) => C[]);
// // type UN1 = TU<(items: number[], transducers: []) => number[]>
// // type Mini<T> = T extends [a: any, b: infer B, c: infer B] ? B : never;
// // type M1 = Mini<[3, true, "hello"]>
// // type TransducerPipeThru<T> = T extends (items: (infer Input)[], transducers: []) => any[]
// //   ? (items: Input[], transduscers: any[]) => Input[]
// //   : T extends (items: (infer Input)[], transducers: [Transducer<infer Input, infer NextArg, infer Return>]) => (infer Return)[]
// //   ? (items: Input[], transducers: [Transducer<Input, NextArg, Return>]) => Return[]
// //   : T extends (items: (infer Input)[], transducers: [Transducer<infer Input, infer NextArg, infer Return>, Transducer<infer NextArg, infer NextArg2, infer Return>]) => (infer Return)[]
// //   ? (items: Input[], transducers: [Transducer<Input, NextArg, Return>, Transducer<NextArg, NextArg2, Return>]) => Return[]
// //   : T extends (items: (infer Input)[], transducers: [Transducer<infer Input, infer NextArg, infer Return>, Transducer<infer NextArg, infer NextArg2, infer Return>, Transducer<infer NextArg2, infer NextArg3, infer Return>]) => (infer Return)[]
// //   ? (items: Input[], transducers: [Transducer<Input, NextArg, Return>, Transducer<NextArg, NextArg2, Return>, Transducer<NextArg2, NextArg3, Return>]) => Return[]
// //   // : T extends (items: (infer A)[], transducers: [Transducer<infer A, infer B, infer C>, Transducer<infer B, infer D, infer E>]) => (infer E)[]
// //   // ? (items: (infer A)[], transducers: [Transducer<infer A, infer B, infer C>, Transducer<infer B, infer D, infer E>]) => (infer E)[]
// //   // : T extends (items: (infer A1)[], transducers: [Transducer<infer A1, infer B1, infer C1>, Transducer<infer B1, infer B2, infer C2>, Transducer<infer B2, infer B3, infer C3>]) => (infer C3)[]
// //   // ? (items: (infer A1)[], transducers: [Transducer<infer A1, infer B1, infer C1>, Transducer<infer B1, infer B2, infer C2>, Transducer<infer B2, infer B3, infer C3>]) => (infer C3)[]
// //   : (items: any[], transducers: Transducer<any, any, any>) => any[];
// // type TP<T> = (accum: T[], transducer: []) => T[];
// // type U1 = TransducerPipeThru<(items: number[], transducers: []) => number[]>
// // type U2 = TransducerPipeThru<(items: string[], transducers: [Transducer<string, string, string>]) => any>
// // type U3 = TransducerPipeThru<(items: string[], transducers: [Transducer<string, number, boolean>, Transducer<number, null, boolean>]) => any>
// // // type U4 = TransducerPipeThru<(items: string[], transducers: [Transducer<string, number, boolean>, Transducer<number, null, boolean>]) => any>
// // type ReducedTrans = (onion: ((item: any) => any[]), trans: Transducer<any, any, any>) => ((item: any) => any[]);
// // export function 
// // export const transduce: TransducerPipeThru<T> = <T>(items, transducers) => {
// //   const reversedTransducers = [...transducers];
// //   reversedTransducers.reverse();
// //   // mutating output is much faster than returning with a spread
// //   const transFn = reversedTransducers.reduce(
// //     <ReducedTrans>((accum, transducer) => (item) => transducer(item, accum)),
// //     (item) => [item],
// //   )
// //   let output = [];
// //   const l = items.length;
// //   for (let i = 0; i < l ; i += 1) {
// //     output = output.concat(transFn(items[i]));
// //   }
// //   return output;
// // }
// type AnyTransducer = Transducer<any, any, any>;
// type ReturnTransducer<R> = Transducer<any, any, R>;
// // type Mooz = <Trans extends AnyTransducer[]>(
// //   items: any[],
// //   transducers extends AnyTransducer[] 
// // )
// type ExtractReturnValue<Fn> = Fn extends (...args: any[]) => infer P ? P : never;
// // type XXX<Input, Transducers extends any[], Return> = Transducers extends []
// //   ? Input
// //   : Return extends 
// type ERV = ExtractReturnValue<(x: number) => number>
// type Rec<Input extends any[], Output, Items extends any[]> =
//   Items extends [] ? ExtractReturnValue<Input> : Output;
// type Maybe<X> = X;
// type Uno<Ins extends any[]> = Ins extends []
//   ? "moo"
//   : Ins extends [infer First]
//   ? First
//   : Ins extends [infer First, ...(infer Next)]
//   ? Uno<Next>
//   : never;
// type UN1 = Uno<["hi", "number", "xx"]>
// type UN2 = Uno<[Transducer<"A", "B", "C">]>
// type EnforceInputValue<I> = Transducer<I, any, any> ? true : false;
// // type EnforceInputValue<I> = Transducer<I, any, any>;
// // type ExtractPassAlongValue<T> = T extends Transducer<any, infer NextArg, any> ? NextArg : never;
// type TInputToReturn<I, T> = T extends Transducer<any, any, infer Return> ? Return : never;
// type TInputToNextArg<I, T> = T extends Transducer<I, infer NextArg, any> ? NextArg : never;
// type ExtractNextArg<T> = T extends Transducer<any, infer NextArg, any> ? NextArg : never;
// type ExtractReturn<T> = T extends Transducer<any, any, infer Return> ? Return : never;
// type TI = TInputToReturn<any, Transducer<"1", "2", "3">>
// type TN = TInputToNextArg<"1", Transducer<"1", "2", "3">>
// type SS<T> = [T];
// type XS<T, I> = T extends SS<I> ? true : false;
// type TransducerPipeThru<Input, Transducers extends AnyTransducer[], InputArg = Input> = Transducers extends []
//   ? (items: Input[]) => Input[]
//   : Transducers extends [infer First]
//     ? First extends EnforceInputValue<InputArg>
//       ? (items: Input[]) => ExtractReturn<First>[]
//       : never
//   : Transducers extends [infer First, ...(infer Next)]
//     ? First extends EnforceInputValue<InputArg>
//       ? TransducerPipeThru<Input, Next, ExtractNextArg<First>>
//       : never
//   : never;
// // type TransducerPipe<Input, Transducers extends any[], InputArg = Input> = Transducers extends []
// //   ? (items: Input[]) => Input[]
// //   : Transducers extends [infer First]
// //     ? First extends EnforceInputValue<InputArg>
// //       ? (items: Input[]) => ExtractReturn<First>[]
// //       : never
// //   : Transducers extends [infer First, ...(infer Next)]
// //     ? First extends EnforceInputValue<InputArg>
// //       ? TransducerPipe<Input, Next, ExtractNextArg<First>>
// //       : never
// //   : never;
// // type TransducerPipeFn = <
// type DO0 = TransducerPipeThru<"a", []>;
// type DO1 = TransducerPipeThru<"A", [Transducer<"A", "B", "C">]>
// type DO2_BAD = TransducerPipeThru<"A", [Transducer<"A", "B", "C">, Transducer<"D", "E", "F">]>
// type DO3 = TransducerPipeThru<"A", [Transducer<"A", "B", "C">, Transducer<"B", "E", "F">]>
// type DO4 = TransducerPipeThru<"A", [Transducer<"A", "B", "C">, Transducer<"B", "E", "F">, Transducer<"E", "G", "H">]>
// type R1 = Rec<((x: string) => number)[], false, []>
// // type Boo<Input[], 
// type TransduceFn = <Input, Transducers extends AnyTransducer[]>
//   (items: Input[], transducers: Transducers) => TransducerPipeThru<Input, Transducers>;
// type AccumType<T, U> = (item: T) => U[];
// type ReducerType = <Input, NextArg, Return>(
//   accum: AccumType<NextArg, Return>,
//   transducer: Transducer<Input, NextArg, Return>
// ) => AccumType<Input, Return>
// // export const transduce = <Input, Transducers extends AnyTransducer[]>(items: Input[], transducers: Transducers): TransducerPipeThru<Input, Transducers> => {
// //   // const center = <Input, NextArg>(val: Input, next: (nextVal: NextArg) => Input[]): Input[] => [val];
// //   // const center: Transducer<T, T, T>(val: T, next): T[] => [val];
// //   // function center<T>(val: T, _next: (nextVal: T) => T[]): T[] {
// //   //   return [val];
// //   // }
// //   const center = <T>(val: T): T[] => [val];
// //   const transFn = transducers.reduce(
// //     <ReducerType>((accum, transducer) => (item) => transducer(item, accum)),
// //     center,
// //   )
// //   let output = [];
// //   const l = items.length;
// //   for (let i = 0; i < l ; i += 1) {
// //     output = output.concat(transFn(items[i]));
// //   }
// //   return output;
// // }
// export function mapT<T, U, V>(fn: (val: T) => U): Transducer<T, U, V> {
//   return (val: T, next: (nextVal: U) => V[]): V[] => next(fn(val));
// }
// const w = transduce([1, 2, 3], [])
// const x = transduce([2, 3, 4] as number[], [mapT((x: number) => x + 1)])
// export const transduce: TransduceFn = (items: any[], transducers: AnyTransducer[]) => {
//   const reversedTransducers = [...transducers];
//   reversedTransducers.reverse();
//   const transFn = reversedTransducers.reduce(
//     ((accum, transducer) => (item) => transducer(item, accum)),
//     (item) => [item],
//   )
//   let output = [];
//   const l = items.length;
//   for (let i = 0; i < l ; i += 1) {
//     output = output.concat(transFn(items[i]));
//   }
//   return output;
// }
