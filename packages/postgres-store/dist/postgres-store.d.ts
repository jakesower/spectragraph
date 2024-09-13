import { RootQuery, Schema } from "data-prism";
import { GetOptions } from "./get.js";
import { Client } from "pg";
export type Resource = {
    type: string;
    id: any;
    attributes: object;
    relationships?: object;
};
type CreateResource = {
    type: string;
    attributes?: object;
    relationships?: object;
};
type UpdateResource = {
    type: string;
    id: any;
    attributes?: object;
    relationships?: object;
};
type DeleteResource = {
    type: string;
    id: any;
};
export type LocalJoin = {
    localColumn: string;
    localColumnType?: string;
};
export type ForeignJoin = {
    foreignColumn: string;
    foreignColumnType?: string;
};
export type ManyToManyJoin = {
    joinTable: string;
    localJoinColumn: string;
    localJoinColumnType?: string;
    foreignJoinColumn: string;
    foreignJoinColumnType?: string;
};
export type Config = {
    db: Client;
    resources: {
        [k: string]: {
            table: string;
            idType?: string;
            columns?: {
                [k: string]: {
                    select?: (table: string, col: string) => string;
                };
            };
            joins?: {
                [k: string]: LocalJoin | ForeignJoin | ManyToManyJoin;
            };
        };
    };
};
export type Context = {
    config: Config;
    schema: Schema;
};
type PostgresStore = {
    getAll: (type: string, options?: GetOptions) => Promise<Resource[]>;
    getOne: (type: string, id: string, options?: GetOptions) => Promise<Resource>;
    create: (resource: CreateResource) => Promise<Resource>;
    update: (resource: UpdateResource) => Promise<Resource>;
    delete: (resource: DeleteResource) => Promise<DeleteResource>;
    query: (query: RootQuery) => Promise<any>;
};
export declare function createPostgresStore(schema: Schema, config: Config): PostgresStore;
export {};
//# sourceMappingURL=postgres-store.d.ts.map