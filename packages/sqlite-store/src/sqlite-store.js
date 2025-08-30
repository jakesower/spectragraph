import {
	createValidator,
	ensureValidCreateResource,
	ensureValidDeleteResource,
	ensureValidMergeResource,
	ensureValidUpdateResource,
	normalizeQuery,
} from "@data-prism/core";
import { query as getQuery } from "./query/index.js";
import { create } from "./create.js";
import { deleteResource } from "./delete.js";
import { update } from "./update.js";
import { merge } from "./merge.js";
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
 * @property {import('better-sqlite3').Database} db
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
 * @property {import('better-sqlite3').Database} db
 * @property {import('data-prism').Schema} schema
 * @property {Ajv} validator
 */

/**
 * @typedef {Object} GetOptions
 * @property {Object<string, "asc"|"desc">} [order]
 * @property {number} [limit]
 * @property {number} [offset]
 * @property {Object<string, unknown>} [where]
 */

/**
 * @typedef {Object} SqliteStore
 * @property {(resource: CreateResource) => Promise<Resource>} create
 * @property {(resource: UpdateResource) => Promise<Resource>} update
 * @property {(resource: CreateResource|UpdateResource) => Promise<Resource>} upsert
 * @property {(resource: DeleteResource) => Promise<DeleteResource>} delete
 * @property {(query: import('data-prism').RootQuery) => Promise<any>} query
 * @property {(resource: CreateResource|UpdateResource) => Promise<Resource>} merge
 * @property {(resources: (CreateResource|UpdateResource)[]) => Promise<Resource[]>} merge
 */

/**
 * Creates a SQLite store instance
 * @param {import('data-prism').Schema} schema - The schema object
 * @param {Config} config - Store configuration
 * @returns {SqliteStore} The SQLite store instance
 */
export function sqliteStore(schema, config) {
	const { validator = createValidator() } = config;
	const context = { config, db: config.db, schema };

	return {
		async create(resource) {
			ensureValidCreateResource(schema, resource, { validator });
			return create(resource, context);
		},

		async update(resource) {
			ensureValidUpdateResource(schema, resource, { validator });
			return update(resource, context);
		},

		async upsert(resource) {
			return resource.id ? this.update(resource) : this.create(resource);
		},

		async delete(resource) {
			ensureValidDeleteResource(schema, resource);
			return deleteResource(resource, context);
		},

		async query(query) {
			const normalized = normalizeQuery(schema, query);
			return getQuery(normalized, {
				...context,
				query: normalized,
			});
		},

		async merge(resourceTreeOrTrees) {
			applyOrMap(resourceTreeOrTrees, (tree) =>
				ensureValidMergeResource(schema, tree, { validator }),
			);
			return merge(resourceTreeOrTrees, context);
		},
	};
}
