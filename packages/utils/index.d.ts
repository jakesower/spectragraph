export function applyOrMap<T, R>(itemItemsOrNull: T | T[] | null | undefined, fn: (item: T) => R): R | R[] | null | undefined;
export function applyOrMapAsync<T, R>(itemItemsOrNull: T | T[] | null, asyncFn: (item: T) => Promise<R>): Promise<R | R[]> | null;
export function pipeThru<T>(init: T, fns: Array<(val: any) => any>): any;