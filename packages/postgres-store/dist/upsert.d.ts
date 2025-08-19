export declare function upsertResourceRow(resource: any, context: any): Promise<{
    type: any;
    id: any;
    attributes: Partial<{
        [x: number]: any;
    }>;
    relationships: any;
}>;
export declare function upsertForeignRelationshipRows(resource: any, context: any): Promise<{
    type: any;
    id: any;
    attributes: Pick<any, string>;
    relationships: any;
}>;
export declare function upsert(resource: any, context: any): Promise<{
    type: any;
    id: any;
    attributes: Pick<any, string>;
    relationships: any;
}>;
