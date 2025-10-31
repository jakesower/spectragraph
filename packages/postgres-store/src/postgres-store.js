import {
	createValidator,
	ensureValidCreateResource,
	ensureValidDeleteResource,
	ensureValidMergeResource,
	ensureValidSchema,
	ensureValidUpdateResource,
	normalizeQuery,
	storeMutation,
} from "@spectragraph/core";
import { applyOrMap } from "@spectragraph/utils";
import { query as getQuery } from "./query/index.js";
import { create } from "./create.js";
import { deleteResource } from "./delete.js";
import { update } from "./update.js";
import { merge } from "./merge.js";
import { withTransaction } from "./lib/store-helpers.js";

/**
 * @typedef {Object} Ref
 * @property {string} type
 * @property {string} id
 */

/**
 * @typedef {Object} Resource
 * @property {string} type
 * @property {any} id
 * @property {Object<string, unknown>} attributes
 * @property {Object<string, Ref|Ref[]>} relationships
 */

/**
 * @typedef {Object} CreateResource
 * @property {string} type
 * @property {string} [id]
 * @property {Object<string, unknown>} [attributes]
 * @property {Object<string, Ref|Ref[]>} [relationships]
 */

/**
 * @typedef {Object} UpdateResource
 * @property {string} type
 * @property {any} id
 * @property {Object<string, unknown>} [attributes]
 * @property {Object<string, Ref|Ref[]>} [relationships]
 */

/**
 * @typedef {Object} DeleteResource
 * @property {string} type
 * @property {any} id
 */

/**
 * @typedef {Object} LocalJoin
 * @property {string} localColumn
 * @property {string} [localColumnType]
 */

/**
 * @typedef {Object} ForeignJoin
 * @property {string} foreignColumn
 * @property {string} [foreignColumnType]
 */

/**
 * @typedef {Object} ManyToManyJoin
 * @property {string} joinTable
 * @property {string} localJoinColumn
 * @property {string} [localJoinColumnType]
 * @property {string} foreignJoinColumn
 * @property {string} [foreignJoinColumnType]
 */

/**
 * @typedef {Object} Config
 * @property {import('pg').Client} db
 * @property {Object<string, {
 *   table: string,
 *   idType?: string,
 *   columns?: Object<string, {
 *     select?: (table: string, col: string) => string
 *   }>,
 *   joins?: Object<string, LocalJoin|ForeignJoin|ManyToManyJoin>
 * }>} resources
 * @property {import('ajv').Ajv} [validator]
 */

/**
 * @typedef {Object} Context
 * @property {Config} config
 * @property {import('spectragraph').Schema} schema
 */

/**
 * @typedef {Object} GetOptions
 * @property {Object<string, "asc"|"desc">} [order]
 * @property {number} [limit]
 * @property {number} [offset]
 * @property {Object<string, unknown>} [where]
 */

/**
 * @typedef {Object} PostgresStore
 * @property {(resource: CreateResource) => Promise<Resource>} create
 * @property {(resource: UpdateResource) => Promise<Resource>} update
 * @property {(resource: CreateResource|UpdateResource) => Promise<Resource>} upsert
 * @property {(resource: DeleteResource) => Promise<DeleteResource>} delete
 * @property {(query: import('spectragraph').RootQuery) => Promise<any>} query
 * @property {(resource: CreateResource|UpdateResource) => Promise<Resource>} merge
 * @property {(resources: (CreateResource|UpdateResource)[]) => Promise<Resource[]>} merge
 */

/**
 * Creates a PostgreSQL store instance
 * @param {import('spectragraph').Schema} schema - The schema object
 * @param {Config} config - Store configuration
 * @returns {PostgresStore} The PostgreSQL store instance
 */
export function createPostgresStore(schema, config) {
	const { validator = createValidator() } = config;

	ensureValidSchema(schema, { validator });

	const context = { config, schema };

	return {
		create: storeMutation(schema, "create", (resource) => {
			ensureValidCreateResource(schema, resource, { validator });
			return withTransaction(config.db, (client) =>
				create(resource, { ...context, client }),
			);
		}),

		update: storeMutation(schema, "update", (resource) => {
			ensureValidUpdateResource(schema, resource, { validator });
			return withTransaction(config.db, (client) =>
				update(resource, { ...context, client }),
			);
		}),

		async upsert(...args) {
			return storeMutation(schema, "upsert", (resource) =>
				resource.id ? this.update(resource) : this.create(resource),
			)(...args);
		},

		async delete(resource) {
			ensureValidDeleteResource(schema, resource);
			return deleteResource(resource, { config, schema });
		},

		async query(query) {
			const normalized = normalizeQuery(schema, query);
			return getQuery(normalized, {
				config,
				schema,
				query: normalized,
			});
		},

		async merge(resourceTreeOrTrees) {
			applyOrMap(resourceTreeOrTrees, (tree) =>
				ensureValidMergeResource(schema, tree, { validator }),
			);

			return withTransaction(config.db, (client) =>
				merge(resourceTreeOrTrees, { ...context, client }),
			);
		},
	};
}
