import { createValidator, ensureValidQuery, normalizeQuery, validateCreateResource, validateDeleteResource, validateResourceTree, validateUpdateResource, } from "data-prism";
import { query as getQuery } from "./query.js";
import { create } from "./create.js";
import { deleteResource } from "./delete.js";
import { update } from "./update.js";
import { getAll, getOne } from "./get.js";
import { upsert } from "./upsert.js";
export function createPostgresStore(schema, config) {
    const { validator = createValidator() } = config;
    return {
        async getAll(type, options = {}) {
            return getAll(type, { config, options, schema });
        },
        async getOne(type, id, options = {}) {
            return getOne(type, id, { config, options, schema });
        },
        async create(resource) {
            const errors = validateCreateResource(schema, resource, validator);
            if (errors.length > 0)
                throw new Error("invalid query", { cause: errors });
            return create(resource, { config, schema });
        },
        async update(resource) {
            const errors = validateUpdateResource(schema, resource, validator);
            if (errors.length > 0)
                throw new Error("invalid query", { cause: errors });
            return update(resource, { config, schema });
        },
        async upsert(resource) {
            const errors = validateResourceTree(schema, resource, validator);
            if (errors.length > 0)
                throw new Error("invalid query", { cause: errors });
            return upsert(resource, { config, schema });
        },
        async delete(resource) {
            const errors = validateDeleteResource(schema, resource, validator);
            if (errors.length > 0)
                throw new Error("invalid query", { cause: errors });
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
        // splice(resource) {
        // 	return splice(resource, {
        // 		schema,
        // 		config,
        // 		store: this,
        // 		validator,
        // 	});
        // },
    };
}
