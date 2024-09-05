import { RootQuery } from "data-prism";
type Resource = {
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
type PostgresStore = {
    create: (resource: CreateResource) => Promise<Resource>;
    update: (resource: UpdateResource) => Promise<Resource>;
    delete: (resource: DeleteResource) => Promise<DeleteResource>;
    query: (query: RootQuery) => Promise<any>;
};
export declare function createPostgresStore(schema: any, config: any): PostgresStore;
export {};
//# sourceMappingURL=postgres-store.d.ts.map