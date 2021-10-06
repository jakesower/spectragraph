/* eslint-disable max-len, no-use-before-define, @typescript-eslint/ban-types */

type Pass = "pass";
type Test<T, U> = [T] extends [U]
  ? [U] extends [T]
    ? Pass
    : { actual: T; expected: U }
  : { actual: T; expected: U };

function typeAssert<T extends Pass>() {} // eslint-disable-line

type Primitive = string | number | boolean | bigint | symbol | null | undefined;
type Expand<T> = T extends Primitive ? T : { [K in keyof T]: T[K] };
type Equals<X, Y> =
    (<T>() => T extends X ? 1 : 2) extends
    (<T>() => T extends Y ? 1 : 2) ? true : false;

type A1 = { a: number };
type A2 = { b: number };
type A3 = { a: number, c: number };
type A4 = Record<string, string>;
type A5 = {
  a: number,
  [k: string]: any,
}
type A6 = { a: string };
type A7 = Record<string, number>;
type A8 = A1 & A4;

// type KnownProperties<T> = {
//   [P in keyof T as string extends P ? never : number extends P ? never : P] : T[P]
// };

type KnownProperties<T> = {
  [P in keyof T as string extends P ? never : number extends P ? never : P]: T[P]
}

type StringPropertyType<T> = (
  string extends keyof T
    ? T extends { [k: string]: infer U }
      ? U
      : never
    : never
)

type NumberPropertyType<T> = (
  string extends keyof T
    ? T extends { [k: string]: infer U }
      ? U
      : never
    : never
)

type SPT1 = StringPropertyType<A1>;
type SPT2 = StringPropertyType<A5>;
type SPT3 = StringPropertyType<A7>;
type SPT4 = StringPropertyType<UnionQ<A7, A6>>;
type SPT5 = StringPropertyType<UnionQ<A8, A6>>;

type UQ1 = UnionQ<A4, A5>;

type HasKeyOfType<T, KeyType> = KeyType extends keyof T ? true : never;

type OnlyIndex<T> = {
  [P in keyof T as string extends P ? P : number extends P ? P : never] : T[P]
};

type PropertiesOfType<T, KeyType extends string | number> = (
  string extends KeyType ? StringProperties<T> : NumberProperties<T>
);

type Union<T extends Record<any, any>, U extends Record<any, any>> = Expand<T & Omit<U, keyof T>>;

type UnionW<T extends Record<any, any>, U extends Record<any, any>> = Expand<(
  KnownProperties<T>
  & Omit<KnownProperties<U>, keyof KnownProperties<T>>
  & StringProperties<T>
  & Omit<StringProperties<U>, keyof StringProperties<T>>
  & NumberProperties<T>
  & Omit<NumberProperties<U>, keyof NumberProperties<T>>
)>;

// type CombinedStringKeys<T, U> = (
//   HasKeyOfType<StringProperties<T>, string> extends true
//     ? HasKeyOfType<StringProperties<U>, string> extends true
//       ? { [k: string]: StringPropertyType<T> | StringPropertyType<U> } & { u: StringPropertyType<U> } & { t: StringPropertyType<T> }
//       : StringProperties<T>
//     : HasKeyOfType<StringProperties<U>, string> extends true
//       ? StringProperties<U>
//       : never
// )

// type CombinedStringKeys<T, U> = (
//   StringPropertyType<T> extends infer TType
//     ? StringPropertyType<U> extends infer UType
//       ? Record<string, TType | UType>
//       : Record<string, TType>
//     : StringPropertyType<U> extends infer UType
//       ? Record<string, UType>
//       : {}
// )

type B1<T> = T extends never ? "yesh" : "no"
type B11 = B1<any>
type B12 = B1<number>

type B2<T> = never extends T ? "yes" : "no"
type B21 = B2<any>
type B22 = B2<number>

type EQ1 = Equals<any, never>

type CombinedStringKeys<T, U> = (
  Equals<StringPropertyType<T>, never> extends true
    ? Equals<StringPropertyType<U>, never> extends true
      ? Record<string, never>
      : Record<string, StringPropertyType<U>>
    : Equals<StringPropertyType<U>, never> extends true
      ? Record<string, StringPropertyType<T>>
        : Equals<StringPropertyType<T>, StringPropertyType<U>> extends true
          ? Record<string, StringPropertyType<T>>
          : Record<string, StringPropertyType<T> | StringPropertyType<U>>
)

type CombinedIndexKeys<T, U, KeyType extends number | string> = (
  Equals<StringPropertyType<T>, never> extends true
    ? Equals<StringPropertyType<U>, never> extends true
      ? {}
      : Record<string, StringPropertyType<U>>
    : Equals<StringPropertyType<U>, never> extends true
      ? Record<string, StringPropertyType<T>>
        : Equals<StringPropertyType<T>, StringPropertyType<U>> extends true
          ? Record<string, StringPropertyType<T>>
          : Record<string, StringPropertyType<T> | StringPropertyType<U>>
)

type XXXX = StringPropertyType<A5>;
type XCSK1 = CombinedStringKeys<A1, A5>;

// type CombinedNumberKeys<T, U> = (
//   HasKeyOfType<NumberProperties<T>, number> extends true
//     ? HasKeyOfType<NumberProperties<U>, number> extends true
//       ? { [k: number]: NumberPropertyType<T> | NumberPropertyType<U> }
//       : NumberProperties<T>
//     : HasKeyOfType<NumberProperties<U>, number> extends true
//       ? NumberProperties<U>
//       : never
// )

// type CombineKeysOfType<T, U, KeyType extends string | number> = (
//   KeyType extends keyof PropertiesOfType<T, KeyType>
//     ? KeyType extends keyof PropertiesOfType<U, KeyType>
//       ? { KeyType: PropertiesOfType<T, KeyType> | PropertiesOfType<U, KeyType> }
//       : PropertiesOfType<T, KeyType>
//     : KeyType extends keyof PropertiesOfType<U, KeyType>
//       ? PropertiesOfType<U, KeyType>
//       : never
// )

type UnionQ<T extends Record<any, any>, U extends Record<any, any>> = Expand<(
  KnownProperties<T>
  & KnownProperties<U>
  // & CombineKeysOfType<T, U, string>
  & CombinedStringKeys<T, U>
  // & CombinedNumberKeys<T, U>
)>;

type UnionAll<T extends any[]> = (
  T extends [infer Head, ...infer Tail]
    ? Tail extends [any, ...any[]]
      ? UnionQ<Head, UnionAll<Tail>>
      : Head
    : never
);

type CSK1 = CombinedStringKeys<A4, A1>;
type CSK2 = CombinedStringKeys<A1, A2>;
type CSK3 = CombinedStringKeys<A1, A5>;
const csk31: CSK3 = { hi: "there" };

type U2 = Union<A1, A2>;

type UA0 = UnionAll<[]>;
type UA1 = UnionAll<[A1]>;
type UA2 = UnionAll<[A1, A2]>;
type UA3 = UnionAll<[A1, A2, A3]>
type UA4 = UnionAll<[A1, A2, A3, A4]>
type UA5 = UnionAll<[A1, A2, A3, A4, A5]>
type UA6 = UnionAll<[A1, A2, A3, A4, A5, A6]>
type UA7 = UnionAll<[A1, A2, A3, A4, A5, A6, A7]>

type PA4 = Partial<UA4>;
const pa41: (PA4 & A1) = { a: 1, f: 0 };

typeAssert<Test<U2, UA2>>();

const a1: A1 = { a: 1 };
const a2: A2 = { b: 5 };
const a3: A3 = { a: 2, c: 4 };
const a4: A4 = { b: "7" };
const a5: A5 = { a: 2, b: "hi" };
const a51: A5 = { a: "hello", b: "no" };

const a52: Union<A1, A4> = { a: 2, b: "hi" };
const a53: Union<A1, A4> = { a: "2", b: "hi" };
const a54: Union<A4, A1> = { a: "2", b: "hi", c: 66 };

const a61: UnionW<A1, A2> = { a: 2, b: 3 };
const a62: UnionW<A1, A4> = { a: 4, b: "hi", c: 66 };
const a63: UnionW<A1, A4> = { a: "2", b: "Hi" };
const a64: UnionW<A4, A1> = { a: "2", b: "Hi" };
const a65: UnionW<A1, A7> = { a: 4, b: 6 };
const a66: UnionW<A7, A1> = { a: 4, b: 6 };
const a67: UnionW<A4, A7> = { a: 4, b: 6 };
const a68: UnionW<A7, A4> = { a: 4, b: 6 };
const a69: UnionW<A7, A4> = { a: 4, b: "six" };
const a60: UnionW<A4, A7> = { a: 4, b: "six" };

const a71: UnionQ<A1, A2> = { a: 2, b: 3 };
const a72: UnionQ<A1, A4> = { a: 4, b: "hi", c: 66 };
const a73: UnionQ<A1, A4> = { a: "2", b: "Hi" };
const a74: UnionQ<A4, A1> = { a: "2", b: "Hi" };
const a75: UnionQ<A1, A7> = { a: 4, b: 6 };
const a76: UnionQ<A7, A1> = { a: 4, b: 6 };
const a77: UnionQ<A4, A7> = { a: 4, b: 6 };
const a78: UnionQ<A7, A4> = { a: 4, b: 6 };
const a79: UnionQ<A7, A4> = { a: 4, b: "six" };
const a70: UnionQ<A4, A7> = { a: 4, b: "six" };
const a7a: UnionQ<A1, A6> = { a: 3 };
const a7b: UnionQ<A6, A1> = { a: 3 };
const a7c: UnionQ<A5, A4> = { a: 3 };
const a7d: UnionQ<A7, A4> = { a: 3 };
const a7e: UnionQ<A7, A4> = { a: "three" };
const a7f: UnionQ<A7, A4> = { a: false };
const a7g: UnionQ<A7, A8> = { a: 3, b: "zooo", c: 3 };
const a7h: UnionQ<A7, A8> = { a: "three", b: "zooo", c: 3 };

type Moo<T> = {} extends T ? "empty" : "not empty";
type M1 = Moo<{}>
type M2 = Moo<{ x: 3 }>
type M3 = Moo<StringProperties<A1>>
type M4 = Moo<StringProperties<A5>>

type SP1 = StringProperties<A1>;
type SP2 = StringProperties<A5>;
type SP3 = StringProperties<A7>;
type SP4 = StringProperties<A7>[string];

type N1 = HasKeyOfType<A1, string>;
type N2 = HasKeyOfType<A5, string>;

type BB = A1 & A4;
const b1 = { a: 1 };
const b2 = { b: "yooo" };
const b3 = { a: "str" };

type OI1 = OnlyIndex<A1>;
type OI2 = OnlyIndex<A4>;
type OI3 = OnlyIndex<A5>;

// type U1 = Union<A1, A2>;
// type U2 = Union<A1, A3>;

// typeAssert<Test<U1, { a: number, b: number }>>();
// typeAssert<Test<U2, { a: number, c: number }>>();

// function fun3<S extends Record<string, any>>(s: S) {
//   type U3 = Union<A1, S>;
//   const u3: U3 = { ...s, ...a1 };
//   return u3;
// }
// const r3 = fun3(a2);
// type R3 = typeof r3;
// typeAssert<Test<R3, { a: number, b: number }>>();

// const r32 = fun3(a3);
// type R32 = typeof r32;
// typeAssert<Test<R32, { a: number, c: number }>>();

// const r33 = fun3(a4);
// type R33 = typeof r33;
// typeAssert<Test<R33, { a: number } & Omit<{ [k: string]: string }, "a">>>();

// type U6 = Union<A1, A4>;
// type O61 = Omit<A1, keyof KnownProperties<A4>>;
// type O62 = Omit<A4, keyof KnownProperties<A1>>;
// type O63 = Omit<KnownProperties<A1>, keyof A4>;
// type O64 = Omit<KnownProperties<A4>, keyof A1>;
// type O65 = Omit<KnownProperties<A1>, keyof KnownProperties<A4>>;
// type O66 = Omit<KnownProperties<A4>, keyof KnownProperties<A1>>;
// const u6: U6 = { a: 3, b: "hello" };

// type RIUnion<T extends Record<any, any>, U extends Record<any, any>> = T & Omit<U, keyof KnownProperties<T>>;
// type U7 = RIUnion<A1, A4>;
// typeAssert<Test<U7, { a: number } & Omit<{ [k: string]: string }, "a">>>();
// const u7: U7 = { a: 3, b: "hello" };

// type Union8<T extends Record<any, any>, U extends Record<any, any>> = T & Omit<U, keyof KnownProperties<T>>;
// type U8 = Union8<A1, A4>;
// typeAssert<Test<U8, { a: number } & Omit<{ [k: string]: string }, "a">>>();
// const u8: U8 = { a: 3, b: "hello" };
