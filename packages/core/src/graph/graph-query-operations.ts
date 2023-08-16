import { get, mapValues, omit, orderBy } from "lodash-es";
import { applyOrMap } from "@data-prism/utils";
import { defaultExpressionEngine } from "@data-prism/expressions";
import { MultiResult, Result } from "../result.js";
import { Schema } from "../schema.js";
import { RootQuery } from "../query.js";
import { GraphConfig } from "../graph.js";
import { createExpressionProjector } from "../projection.js";

type GetOperation = (results: MultiResult) => MultiResult;

const ID = Symbol("id");
const TYPE = Symbol("type");

export function runTreeQuery<S extends Schema, Q extends RootQuery<S>>(
	query: Q,
	context: {
		schema: S;
		data: { [k: string]: { [k: string]: any } };
		config: GraphConfig;
	},
): Result<Q> {
	const { schema, data, config } = context;
	const resDef = schema.resources[query.type];

	if (query.id && !data[query.type][query.id]) return null;

	const getPropertyPath = (path, resType, result) => {
		const [head, ...tail] = path;

		if (tail.length === 0) return result[head];

		const relResDef = schema.resources[resType].relationships[head];
		const relResType = relResDef.resource;

		return applyOrMap(result[head], (relRes) =>
			getPropertyPath(tail, relResType, relRes),
		);
	};

	// this automatically dereferences resources as the graph is navigated; it
	// also adds an ID and TYPE for convenience
	const makeDereffingProxy = (resource, resType) => {
		const resDef = schema.resources[resType];
		const idField = resDef.idField ?? "id";

		return new Proxy(resource, {
			get(target, prop: string | typeof ID | typeof TYPE) {
				if (prop === ID) return target[idField];
				if (prop === TYPE) return resType;

				if (Object.hasOwn(resDef.relationships, prop)) {
					const relResType = resDef.relationships[prop].resource;
					const relatedIdOrIds = target[prop];

					return Array.isArray(relatedIdOrIds)
						? relatedIdOrIds.map((id) =>
							makeDereffingProxy(data[relResType][id], relResType),
						  )
						: relatedIdOrIds === null
							? null
							: makeDereffingProxy(data[relResType][relatedIdOrIds], relResType);
				}
				return target[prop];
			},
		});
	};

	// these are in order of execution
	const operationDefinitions: { [k: string]: GetOperation } = {
		where(results: MultiResult): MultiResult {
			const filterFns = Object.entries(query.where).map(
				([propPath, expr]) =>
					(result) =>
						defaultExpressionEngine.apply(expr, get(result, propPath)),
			);
			const filterFn = (result) => filterFns.every((fn) => fn(result));

			return results.filter(filterFn);
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
			if (!query.properties) {
				return results.map((result) => ({
					type: query.type,
					id: result[resDef.idField ?? "id"],
				}));
			}

			const { properties } = query;

			const projectors = mapValues(properties, (propQuery, propName) => {
				// possibilities: (1) property (2) nested property (3) subquery (4) ref (5) expression
				if (typeof propQuery === "string") {
					// relationship name -- return ref
					if (propQuery in resDef.relationships) {
						const relDef = resDef.relationships[propName];
						return (result) =>
							result[propQuery] === null
								? null
								: { type: relDef.resource, id: result[propQuery][ID] };
					}

					// nested / shallow property
					return (result) => getPropertyPath(propQuery.split("."), query.type, result);
				}

				// expression
				if (defaultExpressionEngine.isExpression(propQuery)) {
					return createExpressionProjector(propQuery);
				}

				// subquery
				const relDef = resDef.relationships[propName];
				return (result) =>
					relDef.cardinality === "one"
						? result[propName]
							? runTreeQuery(
								{ ...propQuery, type: relDef.resource, id: result[propName][ID] },
								context,
							  )
							: null
						: result[propName]
							.map((res) =>
								runTreeQuery(
									{ ...propQuery, id: res[ID], type: relDef.resource },
									context,
								),
							)
							.filter(Boolean);
			});

			return results.map((result) =>
				mapValues(projectors, (project) =>
					project(makeDereffingProxy(result, query.type)),
				),
			);
		},
	};

	const usedOperationDefinitions = omit(operationDefinitions, config.omittedOperations);

	const results = query.id
		? [data[query.type][query.id]]
		: Object.values(data[query.type]);

	const processed = Object.entries(usedOperationDefinitions).reduce(
		(acc, [opName, fn]) => (opName in query || opName === "properties" ? fn(acc) : acc),
		results,
	);

	return query.id ? processed[0] : processed;
}
