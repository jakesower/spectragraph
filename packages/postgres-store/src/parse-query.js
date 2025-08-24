import { snakeCase, uniq } from "lodash-es";
import { whereExpressionEngine } from "./helpers/sql-expressions.js";
import { forEachQuery, someQuery } from "./helpers/query-helpers.js";
import { preQueryRelationships } from "./relationships.js";
import { columnTypeModifiers } from "./column-type-modifiers.js";

/**
 * @typedef {import('./query.js').StoreContext} StoreContext
 */

/**
 * @typedef {Object} QueryClauseContext
 * @property {any} queryInfo - Query information
 * @property {import('data-prism').Schema} schema - Schema
 * @property {string} table - Table name
 * @property {import('data-prism').Query} query - Current query
 * @property {import('data-prism').RootQuery} rootQuery - Root query
 */

/**
 * @typedef {Object} ParsedClause
 * @property {string[]} [where] - WHERE clauses
 * @property {any[]} [vars] - SQL variables
 * @property {any[]} [orderBy] - ORDER BY clauses
 * @property {number} [limit] - LIMIT value
 * @property {number} [offset] - OFFSET value
 * @property {any[]} [select] - SELECT clauses
 * @property {any[]} [join] - JOIN clauses
 */

/**
 * Checks if a query has any to-many relationships
 * @param {import('data-prism').Schema} schema - The schema
 * @param {import('data-prism').RootQuery} query - The query to check
 * @returns {boolean} Whether the query has to-many relationships
 */
const hasToManyRelationship = (schema, query) => {
	return someQuery(schema, query, (_, info) =>
		Object.keys(info.relationships).some(
			(relName) =>
				schema.resources[info.type].relationships[relName].cardinality ===
				"many",
		),
	);
};

/**
 * Query clause extractors for different query parts
 * @type {Object<string, (value: any, context: QueryClauseContext) => ParsedClause>}
 */
const QUERY_CLAUSE_EXTRACTORS = {
	id: (id, { queryInfo, schema }) => {
		if (!id) return {};

		const { idAttribute = "id" } = schema.resources[queryInfo.type];

		return {
			where: [`${queryInfo.type}.${snakeCase(idAttribute)} = ?`],
			vars: [id],
		};
	},
	where: (where, { table }) => {
		const propExprs = Object.entries(where).map(([propKey, propValOrExpr]) => {
			if (whereExpressionEngine.isExpression(where)) {
				// TODO
				// const [operation, args] = Object.entries(where)[0];
				// return whereExpressionEngine.evaluate(where);
			}

			if (whereExpressionEngine.isExpression(propValOrExpr)) {
				const [operation, args] = Object.entries(propValOrExpr)[0];
				return { [operation]: [`${table}.${snakeCase(propKey)}`, args] };
			}

			return { $eq: [`${table}.${snakeCase(propKey)}`, propValOrExpr] };
		});

		const expr = { $and: propExprs };

		return { where: [expr], vars: [expr] };
	},
	order: (order, { table }) => {
		return {
			orderBy: (Array.isArray(order) ? order : [order]).map((orderEntry) => {
				const k = Object.keys(orderEntry)[0];
				return {
					property: k,
					direction: orderEntry[k],
					table,
				};
			}),
		};
	},
	limit: (limit, { query, queryInfo, schema }) => {
		if (limit < 0) {
			throw new Error("`limit` must be at least 0");
		}

		return queryInfo.path.length > 0 || hasToManyRelationship(schema, query)
			? {}
			: { limit, offset: query.offset ?? 0 };
	},
	offset: (offset, { query }) => {
		if (offset < 0) {
			throw new Error("`offset` must be at least 0");
		}

		if (!query.limit) {
			return { offset };
		}
		return {};
	},
	select: (select, context) => {
		const { schema, table, queryInfo } = context;
		const { type } = queryInfo;
		const { idAttribute = "id" } = schema.resources[type];
		const resSchema = schema.resources[type];

		const attributeProps = Object.values(select).filter(
			(p) => typeof p === "string",
		);

		const relationshipsModifiers = preQueryRelationships(context);

		return {
			select: uniq([idAttribute, ...attributeProps]).map((col) => {
				const attrSchema = resSchema.attributes[col];
				const value = `${table}.${snakeCase(col)}`;

				return {
					value,
					sql:
						attrSchema && columnTypeModifiers[attrSchema.type]
							? columnTypeModifiers[attrSchema.type].select(value)
							: value,
				};
			}),
			...relationshipsModifiers,
		};
	},
};

/**
 * Parses a query into SQL clauses
 * @param {import('data-prism').RootQuery} query - The query to parse
 * @param {StoreContext} context - Store context
 * @returns {ParsedClause[]} Array of parsed query clauses
 */
export function parseQuery(query, context) {
	const { schema } = context;
	const clauses = [];

	forEachQuery(schema, query, (subquery, queryInfo) => {
		const table = [query.type, ...queryInfo.path].join("$");

		Object.entries(subquery).forEach(([key, val]) => {
			if (QUERY_CLAUSE_EXTRACTORS[key]) {
				clauses.push(
					QUERY_CLAUSE_EXTRACTORS[key](val, {
						...context,
						queryInfo,
						rootQuery: query,
						query: subquery,
						table,
					}),
				);
			}
		});
	});

	return clauses;
}
