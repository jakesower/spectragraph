import { mapValues } from "lodash-es";
import { Schema, compileSchema } from "./schema.js";
import { MultiRootQuery, SingleRootQuery, ensureValidQuery } from "./query.js";
import { Result } from "./result.js";
import { runTreeQuery } from "./graph/graph-query-operations.js";
import { ExpressionEngine, defaultExpressionEngine } from "@data-prism/expressions";

export type Graph<S extends Schema> = {
	data: { [k: string]: { [k: string]: any } };
	getTree: <Q extends SingleRootQuery<S>>(query: Q) => Result<Q>;
	getTrees: <Q extends MultiRootQuery<S>>(query: Q) => Result<Q>;
};

export type GraphConfig = {
	expressionEngine: ExpressionEngine;
	omittedOperations: string[];
};

const defaultConfig: GraphConfig = {
	expressionEngine: defaultExpressionEngine,
	omittedOperations: [],
};

export function createGraph<S extends Schema>(
	schema: S,
	resources,
	config: Partial<GraphConfig> = {},
) {
	const compiledSchema = compileSchema(schema);
	const fullConfig = { ...defaultConfig, ...config };
	const { expressionEngine } = fullConfig;

	const data = { ...mapValues(schema.resources, () => ({})), ...resources };

	// // this allows for resources in the graph to automatically dereference
	// // themselves for much easier crawling of the raw graph data
	// const makeDereffingProxy = (resource, resType) => {
	// 	const resDef = schema.resources[resType];

	// 	return new Proxy(resource, {
	// 		get(target, prop: string) {
	// 			if (!(prop in resDef.relationships)) return target[prop];

	// 			const relResType = resDef.relationships[prop].resource;
	// 			const relatedIdOrIds = target[prop];
	// 			return Array.isArray(relatedIdOrIds)
	// 				? relatedIdOrIds.map((id) =>
	// 					makeDereffingProxy(data[relResType][id], relResType),
	// 				  )
	// 				: relatedIdOrIds === null
	// 					? null
	// 					: makeDereffingProxy(data[relResType][relatedIdOrIds], relResType);
	// 		},
	// 	});
	// };

	return {
		data,
		getTree<Q extends SingleRootQuery<S>>(query: Q, args = {}) {
			const fullQuery = { ...query, ...args };
			ensureValidQuery(fullQuery, { schema: compiledSchema, expressionEngine });
			return runTreeQuery(fullQuery, { config: fullConfig, schema, data });
		},
		getTrees<Q extends MultiRootQuery<S>>(query: Q, args = {}) {
			const fullQuery = { ...query, ...args };
			ensureValidQuery(fullQuery, { schema: compiledSchema, expressionEngine });
			return runTreeQuery(fullQuery, { config: fullConfig, schema, data });
		},
	};
}
