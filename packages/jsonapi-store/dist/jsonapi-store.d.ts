export declare function createJSONAPIStore(schema: any, config: any): {
    query(query: any): Promise<import("data-prism/dist/graph/query-graph.js").Result>;
    create(resource: any): Promise<void>;
};
