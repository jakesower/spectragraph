import { compileExpression, isExpression } from "@data-prism/expression";
import { applyOrMap, pipeThru } from "@data-prism/utils";
import { preQueryRelationships } from "./relationships.js";

const hasToManyRelationship = (schema, query) =>
	flattenSubQueries(query).some((subquery) =>
		Object.keys(subquery.relationships).some(
			(relKey) => schema.resources[query.type].properties[relKey].cardinality === "many",
		),
	);

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
		incompatibeWith: ["first"],
	},
	constraints: {
		preQuery: {
			apply: (constraints, context) => {
				const { config } = context;
				const { expressionDefinitions } = config;

				// an expression has been passed as the constraint value
				if (isExpression(constraints, expressionDefinitions)) {
					return compileExpression(constraints, expressionDefinitions, context)();
				}

				// an object of properties has been passed in
				const propExprs = Object.entries(constraints).map(([propKey, propValOrExpr]) => {
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
				preQueryRelationships(context.query, context.queryPath, context),
			// flatMapQuery(context.query, (subquery, queryPath) =>
			//   preQueryRelationships(subquery, queryPath, context),
			// ),
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

// TODO: tsort operations
const gatherPreOperations = (query, context) =>
	flatMapQuery(query, (subquery, queryPath) =>
		Object.entries(subquery)
			.flatMap(([operationKey, operationArg]) => {
				const operation = operations[operationKey]?.preQuery?.apply;

				if (!operation) return null;

				const argContext = {
					...context,
					query: subquery,
					queryPath,
					queryTable: [query.type, ...queryPath].join("$"),
					rootQuery: query,
				};

				return operation(operationArg, argContext);
			})
			.filter(Boolean),
	);

const gatherPostOperationFunctions = (query, context) =>
	flatMapQuery(query, (subquery, queryPath) =>
		Object.entries(subquery)
			.map(([operationKey, operationArg]) => {
				const operation = operations[operationKey]?.postQuery?.apply;

				if (!operation) return null;

				const argContext = { ...context, query: subquery, queryPath };
				return (resources) =>
					applyOverPaths(resources, queryPath, (resource) =>
						operation(operationArg, resource, argContext),
					);
			})
			.filter(Boolean),
	);

export async function runQuery(query, context, run) {
	const queryModifierPromises = gatherPreOperations(query, context);
	const queryModifiers = await Promise.all(queryModifierPromises);

	const resources = await run(queryModifiers);

	const postOps = gatherPostOperationFunctions(query, context);

	return pipeThru(resources, postOps);
}
