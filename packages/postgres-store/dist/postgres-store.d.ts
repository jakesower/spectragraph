import { Ref, RootQuery, Schema } from "data-prism";
import { Client } from "pg";
import Ajv from "ajv";
import { GetOptions } from "./get.js";
export type Resource = {
    type: string;
    id: any;
    attributes: {
        [k: string]: unknown;
    };
    relationships: {
        [k: string]: Ref | Ref[];
    };
};
type CreateResource = {
    type: string;
    id?: string;
    attributes?: {
        [k: string]: unknown;
    };
    relationships?: {
        [k: string]: Ref | Ref[];
    };
};
type UpdateResource = {
    type: string;
    id: any;
    attributes?: {
        [k: string]: unknown;
    };
    relationships?: {
        [k: string]: Ref | Ref[];
    };
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
    validator?: Ajv;
};
export type Context = {
    config: Config;
    schema: Schema;
};
export type PostgresStore = {
    getAll: (type: string, options?: GetOptions) => Promise<Resource[]>;
    getOne: (type: string, id: string, options?: GetOptions) => Promise<Resource>;
    create: (resource: CreateResource) => Promise<Resource>;
    update: (resource: UpdateResource) => Promise<Resource>;
    upsert: (resource: CreateResource | UpdateResource) => Promise<Resource>;
    delete: (resource: DeleteResource) => Promise<DeleteResource>;
    query: (query: RootQuery) => Promise<any>;
};
export declare function createPostgresStore(schema: Schema, config: Config): PostgresStore;
export {};
//# sourceMappingURL=postgres-store.d.ts.map