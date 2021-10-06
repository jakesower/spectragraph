// /* eslint-disable max-len, no-use-before-define, @typescript-eslint/ban-types */

// type RemoveIndex<T> = {
//   [ P in keyof T as string extends P ? never : number extends P ? never : P ] : T[P]
// };

// // Passing types through Expand<T> makes TS expand them instead of lazily
// // evaluating the type. This also has the benefit that intersections are merged
// // to show as one object.
// type Primitive = string | number | boolean | bigint | symbol | null | undefined;
// type Expand<T> = T extends Primitive ? T : { [K in keyof T]: T[K] };
// // type Expand<T> = T;

// type OptionalKeys<T> = {
//     [K in keyof T]-?: T extends Record<K, T[K]> ? never : K;
// }[keyof T];

// type RequiredKeys<T> = {
//     [K in keyof T]-?: T extends Record<K, T[K]> ? K : never;
//   }[keyof T]
//   & keyof T;

// type RequiredMergeKeys<T, U> = RequiredKeys<T> & RequiredKeys<U>;

// type OptionalMergeKeys<T, U> =
//     | OptionalKeys<T>
//     | OptionalKeys<U>
//     | Exclude<RequiredKeys<T>, RequiredKeys<U>>
//     | Exclude<RequiredKeys<U>, RequiredKeys<T>>;

// // type MergeNonUnionObjects<T, U> = Expand<
// //     {
// //         [K in RequiredMergeKeys<T, U>]: Expand<Merge<T[K], U[K]>>;
// //     } & {
// //         [K in OptionalMergeKeys<T, U>]?: K extends keyof T
// //             ? K extends keyof U
// //                 ? Expand<Merge<
// //                     Exclude<T[K], undefined>,
// //                     Exclude<U[K], undefined>
// //                 >>
// //                 : T[K]
// //             : K extends keyof U
// //             ? U[K]
// //             : never;
// //     }
// // >;

// type MergeNonUnionObjects<T, U> = Expand<
//     {
//         [K in RequiredMergeKeys<T, U>]: Expand<Merge<T[K], U[K]>>;
//     } & {
//         [K in OptionalMergeKeys<T, U>]?: K extends keyof T
//             ? K extends keyof U
//                 ? Expand<Merge<
//                     Exclude<T[K], undefined>,
//                     Exclude<U[K], undefined>
//                 >>
//                 : T[K]
//             : K extends keyof U
//               ? U[K]
//               : never;
//     }
// >;

// type MergeNonUnionArrays<T extends readonly any[], U extends readonly any[]> = Array<Expand<Merge<T[number], U[number]>>>

// type MergeArrays<T extends readonly any[], U extends readonly any[]> = [T] extends [never]
//     ? U extends any
//         ? MergeNonUnionArrays<T, U>
//         : never
//     : [U] extends [never]
//     ? T extends any
//         ? MergeNonUnionArrays<T, U>
//         : never
//     : T extends any
//     ? U extends any
//         ? MergeNonUnionArrays<T, U>
//         : never
//     : never;

// type MergeObjects<T, U> = (
//   [T] extends [never]
//     ? U extends any
//         ? MergeNonUnionObjects<T, U>
//         : never
//     : [U] extends [never]
//       ? T extends any
//         ? MergeNonUnionObjects<T, U>
//         : never
//       : T extends any
//         ? U extends any
//           ? MergeNonUnionObjects<T, U>
//           : never
//         : never
// );

// type Merge<T, U> =
//     | Extract<T | U, Primitive>
//     | MergeArrays<Extract<T, readonly any[]>, Extract<U, readonly any[]>>
//     | MergeObjects<Exclude<T, Primitive | readonly any[]>, Exclude<U, Primitive | readonly any[]>>;

// type Union<T extends Record<any, any>, U extends Record<any, any>> = {
//   [K in keyof (T & U)]: (
//     K extends keyof T
//       ? K extends keyof U
//         ? Expand<Merge<T[K], U[K]>>
//         : T[K]
//       : K extends keyof U
//         ? U[K]
//         : never
//   )
// }

// // Play

// type A1 = { a: number };
// type A2 = { b: number };
// type A3 = { a: number, c: number };

// type U1 = Union<A1, A2>;
// type U2 = Union<A1, A3>;

// type RMK1 = RequiredMergeKeys<A1, A2>;
// type RMK2 = RequiredMergeKeys<A1, A3>;

// // Formal tests

// type Pass = "pass";
// type Test<T, U> = [T] extends [U]
//     ? [U] extends [T]
//         ? Pass
//         : { actual: T; expected: U }
//     : { actual: T; expected: U };

// function typeAssert<T extends Pass>() {} // eslint-disable-line

// typeAssert<Test<RequiredKeys<never>, never>>();
// typeAssert<Test<RequiredKeys<{}>, never>>();
// typeAssert<Test<RequiredKeys<{ a: 1; b: 1 | undefined }>, "a" | "b">>();

// typeAssert<Test<OptionalKeys<never>, never>>();
// typeAssert<Test<OptionalKeys<{}>, never>>();
// typeAssert<Test<OptionalKeys<{ a?: 1; b: 1 }>, "a">>();

// typeAssert<Test<OptionalMergeKeys<never, {}>, never>>();
// typeAssert<Test<OptionalMergeKeys<never, { a: 1 }>, "a">>();
// typeAssert<Test<OptionalMergeKeys<never, { a?: 1 }>, "a">>();
// typeAssert<Test<OptionalMergeKeys<{}, {}>, never>>();
// typeAssert<Test<OptionalMergeKeys<{ a: 1 }, { b: 2 }>, "a" | "b">>();
// typeAssert<Test<OptionalMergeKeys<{}, { a?: 1 }>, "a">>();

// typeAssert<Test<RequiredMergeKeys<never, never>, never>>();
// typeAssert<Test<RequiredMergeKeys<never, {}>, never>>();
// typeAssert<Test<RequiredMergeKeys<never, { a: 1 }>, never>>();
// typeAssert<Test<RequiredMergeKeys<{ a: 0 }, { a: 1 }>, "a">>();

// typeAssert<Test<MergeObjects<never, never>, never>>();
// typeAssert<Test<MergeObjects<never, {}>, {}>>();
// typeAssert<Test<MergeObjects<never, { a: 1 }>, { a?: 1 }>>();

// typeAssert<Test<Merge<never, never>, never>>();
// typeAssert<Test<Merge<never, string>, string>>();
// typeAssert<Test<Merge<string, number>, string | number>>();
// typeAssert<Test<Merge<never, {}>, {}>>();
// typeAssert<Test<Merge<never, { a: 1 }>, { a?: 1 }>>();
// typeAssert<Test<Merge<{ a: 1 }, never>, { a?: 1 }>>();
// typeAssert<Test<Merge<string | { a: 1 }, { a: 2 }>, string | { a: 1 | 2 }>>();
// typeAssert<
//     Test<Merge<{ a: 1 }, { a: 2 } | { b: 1 }>, { a: 1 | 2 } | { a?: 1; b?: 1 }>
// >();

// typeAssert<Test<Merge<{ x: number[] }, {}>, { x?: number[] }>>();
// typeAssert<Test<Merge<{ x: number[] }, { x: number[] }>, { x: number[] }>>();
// typeAssert<Test<Merge<{ x: number[] }, { x: string[] }>, { x:(number | string)[] }>>();

// typeAssert<Test<Merge<{ x: [1, 2] }, { x: [3] }>, { x:(1 | 2 | 3)[] }>>();
// typeAssert<Test<Merge<{ x: [1, 2] }, { x: number[] }>, { x: number[] }>>();

// typeAssert<Test<Merge<{ x: { x: string }[] }, { x: {}[]}>, { x: { x?: string }[] }>>();
// typeAssert<Test<Merge<{ x: readonly { x: string }[] }, { x: {}[]}>, { x: { x?: string }[] }>>();
// typeAssert<Test<Merge<{ x: readonly { x: string }[] }, { x: readonly {}[]}>, { x: { x?: string }[] }>>();

// typeAssert<Test<Merge<{ x: string[] | number[] }, { x: number[] }>, { x: number[] |(string | number)[] }>>();
// typeAssert<Test<Merge<{ x: { y: 1 }[] | string[] }, { x: number[] }>, { x:({ y?: 1 } | number)[] | (string | number)[] }>>();

// type A = {
//     a: string;
//     b: number;
//     c: boolean;
//     d: {
//         a2: string;
//         b2: number;
//     };
//     e?: number;
//     f?: symbol;
//     g?: number;
//     h: string;
// };

// type B = {
//     a: string;
//     b: boolean;
//     d: {
//         a2: string;
//         c2: boolean;
//     };
//     f?: symbol;
//     g: number;
//     h: string | undefined;
// };

// type AB = Merge<A, B>;

// // type Schema = Record<string, number>;

// // const moo = <S extends Schema>(schema: S) => {
// //   type C1 = { a: number };
// //   type C2 = { b: string };

// //   type S2 = { [K in keyof S]: S[K] };

// //   // type X1 = Merge<S, C1>;
// //   // const x1: X1 = { a: 5 };

// //   type X2 = Union<C1, C2>;
// //   const x2: X2 = { a: 5, b: "3" };

// //   typeAssert<Test<Union<{ a: number }, { b: string }>, { a: number, b: string }>>();

// //   type X3 = Merge<C1, S>;
// //   type X4 = Union<C1, RemoveIndex<S>>
// //   type X5 = Partial<X4>;
// //   // typeAssert<Test<("a" extends keyof S ? "yes" : "no"), "yes">>();

// //   const x3: X3 = { a: 3 };
// //   const x4: X4 = { a: 3 };
// //   const x5: X5 = { a: 3 };

// //   // type ExpectedKeys = keyof
// //   // typeAssert<Test<Union<S2, { a: number }>, { a: number, S2 }>>();
// // };

// // type RI1 = RemoveIndex<{ a: 3 }>;
// // type RI2 = RemoveIndex<Record<string, string>>;
