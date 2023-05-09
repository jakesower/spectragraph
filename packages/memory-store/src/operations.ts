import { mapValues, orderBy } from "lodash-es";
import { QueryOfType, evaluators } from "@data-prism/store-core/query";
import { Schema } from "@data-prism/store-core/schema";
import { MultiResult, Result } from "../../store-core/src/result.js";
import { InternalStore } from "./memory-store.js";

type GetOperation = (results: MultiResult) => MultiResult;

export function runQuery<
	S extends Schema,
	ResType extends keyof S["resources"] & string,
	Q extends QueryOfType<S, ResType>,
>(query: Q, context: { schema: S; store: InternalStore }): Result<Q> {
	const { schema, store } = context;
	const resDef = schema.resources[query.type];

	if (query.id && !store[query.type][query.id]) return null;

	// these are in order of execution
	const operationDefinitions: { [k: string]: GetOperation } = {
		where(results: MultiResult): MultiResult {
			const filter = (evaluators.where as any).distribute(query.where);
			const filterFn = evaluators.where.compile(filter);

			return results.filter((result) => filterFn(result));
		},
		order(results: MultiResult): MultiResult {
			return orderBy(
				results,
				query.order?.map((o) => o.property),
				query.order?.map((o) => o.direction),
			);
		},
		limit(results: MultiResult): MultiResult {
			const { limit = 0, offset = 0 } = query;
			if (limit <= 0) throw new Error("`limit` must be at least 1");

			return results.slice(offset, limit + offset);
		},
		offset(results: MultiResult): MultiResult {
			if ((query.offset ?? 0) < 0) throw new Error("`offset` must be at least 0");
			return query.limit ? results : results.slice(query.offset);
		},
		first(results) {
			return [results[0]];
		},
		properties(results) {
			const properties = query.properties ?? { [resDef.idField ?? "id"]: {} };
			return results.map((result) =>
				mapValues(properties, (propQuery, propName) => {
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

	const results = query.id
		? [store[query.type][query.id]]
		: Object.values(store[query.type]);

	const processed = Object.entries(operationDefinitions).reduce(
		(acc, [opName, fn]) => (opName in query || opName === "properties" ? fn(acc) : acc),
		results,
	);

	return query.first || query.id ? processed[0] : processed;
}
