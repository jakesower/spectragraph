import { mapValues, orderBy, pick } from "lodash-es";
import { Query, RootQuery, evaluators } from "./query";
import { Schema } from "./schema";
import { MultiResult, Result, SingleResult } from "./result";
import { InternalStore } from "./memory-store";

type GetContext = { schema: Schema; store: InternalStore; type?: string };
type GetOperation<S extends Schema> = (
	query: RootQuery<S>,
	results: MultiResult,
	context: GetContext,
) => MultiResult;

export function runQuery<S extends Schema>(
	query: RootQuery<S>,
	context: { schema: S; store: InternalStore },
): Result {
	const { schema, store } = context;
	const resDef = schema.resources[query.type];

	// these are in order of execution
	const operationDefinitions: { [k: string]: GetOperation<S> } = {
		where(query: Query<S>, results: MultiResult): MultiResult {
			const filter = evaluators.where.distribute(query.where);
			const filterFn = evaluators.where.compile(filter);

			return results.filter((result) => filterFn(result));
		},
		order(query: Query<S>, results: MultiResult): MultiResult {
			return orderBy(
				results,
				query.order?.map((o) => o.property),
				query.order?.map((o) => o.direction),
			);
		},
		limit(query: Query<S>, results: MultiResult): MultiResult {
			const { limit = 0, offset = 0 } = query;
			if (limit <= 0) throw new Error("`limit` must be at least 1");

			return results.slice(offset, limit + offset);
		},
		offset(query: Query<S>, results: MultiResult): MultiResult {
			if ((query.offset ?? 0) < 0) throw new Error("`offset` must be at least 0");
			return query.limit ? results : results.slice(query.offset);
		},
		first(query, results) {
			return [results[0]];
		},
		properties(query, results) {
			return results.map((result) =>
				mapValues(query.properties, (propQuery, propName) => {
					if (!(propName in resDef.relationships)) return result[propName];

					const relDef = resDef.relationships[propName];
					return relDef.cardinality === "one"
						? result[propName]
							? runQuery(
								{ ...propQuery, type: relDef.resource, id: result[propName] },
								context,
							  )
							: null
						: result[propName]
							.map((id) =>
								runQuery({ ...propQuery, id, type: relDef.resource }, context),
							)
							.filter(Boolean);
				}),
			);
		},
	};

	if (query.id && !store[query.type][query.id]) return null;
	const defaultedQuery: RootQuery<S> = { properties: { [resDef.idField]: {} }, ...query };

	const results = query.id
		? [store[query.type][query.id]]
		: Object.values(store[query.type]);

	const processed = Object.entries(operationDefinitions).reduce(
		(acc, [opName, fn]) =>
			opName in defaultedQuery ? fn(defaultedQuery, acc, context) : acc,
		results,
	);

	return query.first || query.id ? processed[0] : processed;
}
