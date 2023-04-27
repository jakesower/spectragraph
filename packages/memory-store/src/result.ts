export type SingleResult = { [k: string]: any } | null;
export type MultiResult = SingleResult[];
export type Result<Q> = Q extends { id: any } ? SingleResult : MultiResult;
