import { Context, Resource } from "./postgres-store.js";
export type GetOptions = {
    includeRelationships?: boolean;
};
export type GetContext = Context & {
    options: GetOptions;
};
export declare function getOne(type: string, id: string, context: GetContext): Promise<Resource>;
export declare function getAll(type: string, context: GetContext): Promise<Resource[]>;
//# sourceMappingURL=get.d.ts.map