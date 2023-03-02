import { orderBy, pick } from "lodash-es";
import { Query } from "./query";
import { Schema } from "./schema";
import { MultiResult, Result, SingleResult } from "./result";

type GetOperation = (query: Query, results: MultiResult) => MultiResult;
type FirstOperation = (results: MultiResult) => SingleResult;

// these are in order of execution
const operationDefinitions: { [k: string]: GetOperation } = {
	// properties(query, results) {
	// 	const props = query.properties ?? { [resDef.idField]: {} as Query };
	// 	return mapValues(props, (propQuery, propName) => {
	// 		if (propName in resDef.relationships) {
	// 			const relDef = resDef.relationships[propName];

	// 			return relDef.cardinality === "one"
	// 				? res[propName]
	// 					? compileQuery(relDef.resource, { ...propQuery, id: res[propName] })
	// 					: null
	// 				: res[propName].map((id) =>
	// 					compileQuery(relDef.resource, { ...propQuery, id }),
	// 					);
	// 		}

	// 		return res[propName];
	// 	});
	// },
	where(query: Query, results: MultiResult): MultiResult {},
	order(query: Query, results: MultiResult): MultiResult {
		return orderBy(
			results,
			query.order?.map((o) => o.property),
			query.order?.map((o) => o.direction),
		);
	},
	limit(query: Query, results: MultiResult): MultiResult {
		const { limit = 0, offset = 0 } = query;
		if (limit <= 0) throw new Error("`limit` must be at least 1");

		return results.slice(offset, limit + offset);
	},
	offset(query: Query, results: MultiResult): MultiResult {
		if ((query.offset ?? 0) < 0) throw new Error("`offset` must be at least 0");
		return query.limit ? results : results.slice(query.offset);
	},
};

export function runOperations(query: Query, results: MultiResult): Result {
	const processed = Object.entries(operationDefinitions).reduce(
		(acc, [opName, fn]) => (opName in query ? fn(query, acc) : acc),
		results,
	);

	return query.first ? processed[0] : processed;
	// const queryArgs = pick(operationDefinitions, Object.keys(query));
	// return Object.entries(operationDefinitions).reduce(
	// 	(acc, [opName, fn]) => (opName in query ? fn(acc, query[opName]) : acc),
	// 	results,
	// );
}
