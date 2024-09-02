import { normalizeQuery } from "data-prism";
import { query as getQuery } from "./query.js";
import { create } from "./create.js";
import { deleteResource } from "./delete.js";
import { update } from "./update.js";

export function createPostgresStore(schema, config) {
	return {
		create: async (resource) => {
			return create(resource, { config, schema });
		},
		update: async (resource) => {
			return update(resource, { config, schema });
		},
		delete: async (resource) => {
			return deleteResource(resource, { config, schema });
		},
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
