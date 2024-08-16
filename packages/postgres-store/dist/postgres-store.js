import { normalizeQuery } from "data-prism";
import { query as getQuery } from "./query.js";
export function createPostgresStore(schema, config) {
    return {
        query: async (query) => {
            const normalized = normalizeQuery(query);
            return getQuery(normalized, {
                config,
                schema,
                query: normalized,
            });
        },
    };
}
