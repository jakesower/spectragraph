import { normalizeQuery } from "./query/normalize-query.js";
import { validateQuery } from "./query/validate-query.js";

/**
 * @typedef {Object} Expression
 * @property {*} [key] - Dynamic expression properties
 */

/**
 * @typedef {Object} Query
 * @property {string} [id] - Fetch a single resource by ID (mutually exclusive with ids)
 * @property {string[]} [ids] - Fetch multiple resources by IDs (mutually exclusive with id)
 * @property {number} [limit]
 * @property {number} [offset]
 * @property {Object|Object[]} [order] - Single order object or array of order objects
 * @property {Array|Object|string} select - Select clause: array, object, or "*"
 * @property {string} [type]
 * @property {Object} [where] - Where conditions
 * @property {*} [meta] - User information about the query ignored by SpectraGraph
 */

/**
 * @typedef {Query} RootQuery
 * @property {string} type - Required type for root queries
 */

/**
 * @typedef {Query} NormalQuery
 * @property {Object} select - Normalized select object
 * @property {Object[]} [order] - Array of order objects
 * @property {string} type - Required type
 * @property {Object} relationships - The selected relationships
 * @property {Object} values - Selected scalar values (non relationships)
 */

export { normalizeQuery, validateQuery };
