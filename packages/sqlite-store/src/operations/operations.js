import { compileExpression, isExpression } from "@data-prism/expressions";
import { applyOrMap, pipeThru } from "@data-prism/utils";
import { preQueryRelationships } from "./relationships.js";
import { flattenQuery } from "../helpers/query-helpers.ts";
import { uniq } from "lodash-es";

const hasToManyRelationship = (schema, query) => {
	const flatQueries = flattenQuery(schema, query);

	return flatQueries.some((flatQuery) =>
		Object.keys(flatQuery.relationships).some(
			(relKey) => schema.resources[query.type].properties[relKey].cardinality === "many",
		),
	);
};

const operations = {
	id: {
		preQuery: {
			apply: async (id, { query, schema }) => {
				const { table } = schema.resources[query.type].store;
				return { where: [`${table}.id = ?`], vars: [id] };
			},
		},
		postQuery: {
			apply: (_, resources) => {
				return resources[0] ?? null;
			},
		},
	},
	where: {
		preQuery: {
			apply: (where, context) => {
				const { config } = context;
				const { expressionDefinitions } = config;

				// an expression has been passed as the constraint value
				if (isExpression(where, expressionDefinitions)) {
					return compileExpression(where, expressionDefinitions, context)();
				}

				// an object of properties has been passed in
				const propExprs = Object.entries(where).map(([propKey, propValOrExpr]) => {
					if (isExpression(propValOrExpr, expressionDefinitions)) {
						const [operation, args] = Object.entries(propValOrExpr)[0];
						return { [operation]: [{ $prop: propKey }, args] };
					}

					return { $eq: [{ $prop: propKey }, propValOrExpr] };
				});

				const objectExpression = { $and: propExprs };
				return compileExpression(objectExpression, expressionDefinitions, context)();
			},
		},
	},
	order: {
		preQuery: {
			apply: (order, { queryTable }) => [
				{ orderBy: order.map((o) => ({ ...o, table: queryTable })) },
			],
		},
	},
	limit: {
		preQuery: {
			apply: (limit, { query, queryPath, schema }) =>
				queryPath.length > 0 || hasToManyRelationship(schema, query)
					? []
					: [{ limit, offset: query.offset ?? 0 }],
		},
		postQuery: {
			apply: (limit, resources, { query, queryPath, schema }) => {
				const { offset = 0 } = query;

				return queryPath.length > 0 || hasToManyRelationship(schema, query)
					? resources.slice(offset, limit + offset)
					: resources;
			},
		},
	},
	offset: {
		preQuery: {
			apply: (offset, { query }) => {
				if (!query.limit) {
					return [{ limit: -1, offset }];
				}
				return [];
			},
		},
	},
	relationships: {
		preQuery: {
			apply: (_, context) =>
				preQueryRelationships(context),
			// flatMapQuery(context.query, (subquery, queryPath) =>
			//   preQueryRelationships(subquery, queryPath, context),
			// ),
		},
	},
	properties: {
		preQuery: {
			apply: (properties, { table }) => ({
				select: uniq(["id", ...properties]).map((col) => `${table}.${col}`),
			}),
		},
	},
};

const applyOverPaths = (resources, path, fn) => {
	if (path.length === 0) return fn(resources);

	const [head, ...tail] = path;
	return applyOrMap(resources, (resource) => ({
		...resource,
		[head]: applyOverPaths(resource[head], tail, fn),
	}));
};

// helpful: split query up into props, refs, and subqueries

const gatherPreOperations = (query, context) => {
	const { schema } = context;
	const flatQueries = flattenQuery(schema, query);
	const queryParts = flatQueries.flatMap((flatQuery) =>
		Object.entries(flatQuery).flatMap(([operationKey, operationArg]) => {
			const operation = operations[operationKey]?.preQuery?.apply;

			if (!operation) return [];

			const argContext = {
				...context,
				query: flatQuery,
				queryPath: flatQuery.path,
				table: [query.type, ...flatQuery.path].join("$"),
				rootQuery: query,
			};

			return operation(operationArg, argContext);
		}),
	);

	return queryParts;
};

export async function runQuery(query, context, run) {
	const queryModifierPromises = gatherPreOperations(query, context);
	const queryModifiers = await Promise.all(queryModifierPromises);

	return run(queryModifiers);
}
