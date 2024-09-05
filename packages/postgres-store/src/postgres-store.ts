import { normalizeQuery, Query, RootQuery } from "data-prism";
import { query as getQuery } from "./query.js";
import { create } from "./create.js";
import { deleteResource } from "./delete.js";
import { update } from "./update.js";

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

export function createPostgresStore(schema, config): PostgresStore {
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
