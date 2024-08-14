import { query as getQuery } from "./query.js";
export function createPostgresStore(schema, config) {
    return {
        query: async (query) => getQuery(query, {
            config,
            schema,
            query,
        }),
    };
}
