import { normalizeQuery } from "data-prism";
import { query as getQuery } from "./query.js";
import { create } from "./create.js";

export function createPostgresStore(schema, config) {
	return {
		create: async (resource) => {
			return create(resource, { config, schema });
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
