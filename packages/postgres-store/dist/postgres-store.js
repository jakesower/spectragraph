import { ensureValidQuery, normalizeQuery, } from "data-prism";
import { query as getQuery } from "./query.js";
import { create } from "./create.js";
import { deleteResource } from "./delete.js";
import { update } from "./update.js";
import { getAll, getOne } from "./get.js";
export function createPostgresStore(schema, config) {
    return {
        async getAll(type, options = {}) {
            return getAll(type, { config, options, schema });
        },
        async getOne(type, id, options = {}) {
            return getOne(type, id, { config, options, schema });
        },
        async create(resource) {
            return create(resource, { config, schema });
        },
        async update(resource) {
            return update(resource, { config, schema });
        },
        async delete(resource) {
            return deleteResource(resource, { config, schema });
        },
        async query(query) {
            ensureValidQuery(schema, query);
            const normalized = normalizeQuery(query);
            return getQuery(normalized, {
                config,
                schema,
                query: normalized,
            });
        },
    };
}
