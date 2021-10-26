import equals from 'deep-equal';
export { equals };
export { pick } from "./pick";
declare type Ord = number | string | boolean | Date;
export declare function append<T, U>(xs: T[], ys: U[]): (T | U)[];
export declare function appendKeys<T, K extends keyof T>(base: {
    [k: string]: T[K][];
}, other: {
    [k: string]: T[K][];
}): {
    [k: string]: T[K][];
};
export declare function applyOrMap<T, U>(valueOrArray: T[], fn: (item: T) => U): U[];
export declare function applyOrMap<T, U>(valueOrArray: T, fn: (item: T) => U): U;
export declare function arraySetDifference<T>(xs: T[], ys: T[]): T[];
export declare function arraySetDifferenceBy<T, U>(xs: T[], ys: T[], fn: (val: T) => U): T[];
export declare function arrayUnion<T, U>(xs: T[], ys: U[]): (T | U)[];
export declare function assignChildren(objs: {
    [k: string]: {
        [k: string]: any;
    };
}[]): {
    [k: string]: {
        [k: string]: any;
    };
};
export declare function chainPipeThru(val: any, fns: ((x: any) => any)[]): any;
export declare function cmp(a: Ord, b: Ord): number;
export declare function deepClone<T>(obj: T): T;
export declare function difference<T>(left: Set<T>, right: Set<T>): Set<T>;
export declare function fgo(generator: any): any;
export declare function fillObject<T>(keys: string[], value: T): {
    [k: string]: T;
};
export declare function filterObj<T>(obj: {
    [k: string]: T;
}, predicateFn: (x: T) => boolean): {
    [k: string]: T;
};
export declare function findObj<T>(obj: {
    [k: string]: T;
}, predicateFn: (x: T) => boolean): T | null;
export declare function flatMap<T>(xs: T[], fn: (x: T) => T[]): T[];
export declare function forEachObj<T, U>(obj: {
    [k in string]: T;
}, fn: (x: T, idx: string) => any): void;
export declare function flatten<T>(xs: T[][]): T[];
export declare function groupBy<T>(items: T[], fn: (item: T) => string): {
    [k: string]: T[];
};
export declare function indexOn(xs: any, keys: any): any;
export declare function inlineKey<T extends Record<string, Record<string, any>>, K extends string>(obj: T, keyProp: K): {
    [P in keyof T]: T[P] & {
        [k in K]: string;
    };
};
export declare function keyBy<T>(items: T[], fn: (item: T) => string): Record<string, T>;
export declare function keyByProp<T, K extends keyof T>(items: T[], key: K): Record<K, T>;
export declare function mapObj<T extends Record<string, any>, U>(obj: T, fn: (val: T[keyof T], key: keyof T & string) => U): {
    [K in keyof T]: U;
};
export declare function mapObjToArray<T, U>(obj: {
    [k in string]: T;
}, fn: (x: T, idx: string) => U): U[];
export declare function maxStable<T>(fn: (a: T) => Ord, xs: T[]): T;
export declare function mapResult(resultOrResults: any, fn: any): any;
export declare function mergeAll<T>(items: {
    [k in string]: T;
}[]): {
    [k in string]: T;
};
export declare function mergeChildren(obj: {
    [k: string]: {
        [k: string]: any;
    };
}, ext: {
    [k: string]: {
        [k: string]: any;
    };
}): {
    [k: string]: {
        [k: string]: any;
    };
};
export declare function mergeWith<T, U, V>(base: {
    [k: string]: T;
}, other: {
    [k: string]: U;
}, combiner: (x: T, y: U) => V): {
    [k: string]: T | U | V;
};
export declare function overPath(obj: any, path: any, fn: any): any;
export declare function omit<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>;
export declare function parseQueryParams(rawParams: any): {};
export declare function partition<T>(items: T[], predicateFn: (val: T) => boolean): [T[], T[]];
export declare function pathOr(obj: any, path: any, otherwise: any): any;
export declare function pipe(fns: ((x: any) => any)[]): (x: any) => any;
export declare function pipeMw(init: any, mws: any): Promise<any>;
export declare function pipeThru(val: any, fns: ((x: any) => any)[]): any;
export declare function pluckKeys<T>(obj: {
    [k: string]: T;
}, keep: string[]): {
    [k: string]: T;
};
export declare function reduceObj<T, U>(obj: {
    [k: string]: T;
}, init: U, reducer: (acc: U, v: T, k: string) => U): U;
export declare function sortBy<T>(fn: (a: T, b: T) => number, xs: T[]): T[];
export declare function sortByAll<T>(fns: ((a: T, b: T) => number)[], xs: T[]): T[];
export declare function sortWith<T>(fn: (a: T) => Ord, xs: T[]): T[];
export declare function sortWithAll<T>(fns: ((a: T) => Ord)[], xs: T[]): T[];
export declare function uniq<T>(xs: T[]): T[];
export declare function uniqBy<T>(xs: T[], fn: (x: T) => Ord): T[];
export declare function union<T>(left: Set<T>, right: Set<T>): Set<T>;
export declare function unnest<T>(xs: T[][]): T[];
export declare function xprod<T, U>(xs: T[], ys: U[]): [T, U][];
export declare function zipObj<T>(keys: string[], vals: T[]): {
    [k: string]: T;
};
