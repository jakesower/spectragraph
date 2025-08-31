import {
	createValidator,
	ensureValidSchema,
	normalizeQuery,
	validateCreateResource,
	validateDeleteResource,
	validateMergeResource,
	validateUpdateResource,
} from "@data-prism/core";
import { query as getQuery } from "./query/index.js";
import { create } from "./create.js";
import { deleteResource } from "./delete.js";
import { update } from "./update.js";
import { upsert } from "./upsert.js";
import { merge } from "./merge.js";
import { withTransaction } from "./lib/store-helpers.js";
import { applyOrMap } from "@data-prism/utils";

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
 * @property {import('data-prism').Schema} schema
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
 * @property {(query: import('data-prism').RootQuery) => Promise<any>} query
 * @property {(resource: CreateResource|UpdateResource) => Promise<Resource>} merge
 * @property {(resources: (CreateResource|UpdateResource)[]) => Promise<Resource[]>} merge
 */

/**
 * Creates a PostgreSQL store instance
 * @param {import('data-prism').Schema} schema - The schema object
 * @param {Config} config - Store configuration
 * @returns {PostgresStore} The PostgreSQL store instance
 */
export function createPostgresStore(schema, config) {
	const { validator = createValidator() } = config;

	ensureValidSchema(schema, { validator });

	const context = { config, schema };

	return {
		async create(resource) {
			const errors = validateCreateResource(schema, resource, { validator });
			if (errors.length > 0) {
				throw new Error("invalid resource", { cause: errors });
			}

			return withTransaction(config.db, (client) =>
				create(resource, { ...context, client }),
			);
		},

		async update(resource) {
			const errors = validateUpdateResource(schema, resource, { validator });
			if (errors.length > 0) {
				throw new Error("invalid resource", { cause: errors });
			}

			return withTransaction(config.db, (client) =>
				update(resource, { ...context, client }),
			);
		},

		async upsert(resource) {
			const errors = validateMergeResource(schema, resource, { validator });
			if (errors.length > 0) {
				throw new Error("invalid resource", { cause: errors });
			}

			return upsert(resource, { config, schema });
		},

		async delete(resource) {
			const errors = validateDeleteResource(schema, resource);
			if (errors.length > 0) {
				throw new Error("invalid resource", { cause: errors });
			}

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
				validateMergeResource(schema, tree, { validator }),
			);

			return withTransaction(config.db, (client) =>
				merge(resourceTreeOrTrees, { ...context, client }),
			);
		},
	};
}
