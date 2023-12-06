import { mapValues } from "lodash-es";
import { Schema, compileSchema } from "./schema.js";
import {
	MultiRootQuery,
	SingleRootQuery,
	compileQuery,
	ensureValidQuery,
} from "./query.js";
import { Result } from "./result.js";
import { runTreeQuery } from "./graph/graph-query-operations.js";
import { ExpressionEngine, defaultExpressionEngine } from "@data-prism/expressions";
import { applyOrMap } from "@data-prism/utils";

type Ref = {
	type: string;
	id: string | number;
}

type CanonicalGraph = {
	[k: string]: {
		[k: string]: {
			attributes: { [k: string]: unknown };
			relationships: { [k: string]: Ref | Ref[]}
		}
	}
}

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

export const ID = Symbol("id");
export const TYPE = Symbol("type");

export function createGraph<S extends Schema>(
	schema: S,
	resources: CanonicalGraph,
	config: Partial<GraphConfig> = {},
) {
	const compiledSchema = compileSchema(schema);
	const fullConfig = { ...defaultConfig, ...config };
	const { expressionEngine } = fullConfig;

	const data = {};
	Object.entries(resources).forEach(([resType, ressOfType]) => {
		data[resType] = {};
		Object.entries(ressOfType).forEach(([resId, res]) => {
			const val = {};

			val[TYPE] = resType;
			val[ID] = resId;

			Object.entries(res.attributes).forEach(([attrName, attrVal]) => {
				val[attrName] = attrVal;
			});

			Object.entries(res.relationships).forEach(([relName, relVal]) => {
				Object.defineProperty(val, relName, {
					get() {
						const dereffed = applyOrMap(relVal, (rel: Ref) => data[rel.type][rel.id]);
						Object.defineProperty(this, relName, {
							value: dereffed,
							writable: false,
							configurable: false,
						});
						return dereffed;
					},
					configurable: true,
					enumerable: true,
				});
			});

			data[resType][resId] = val;
		});
	});

	// const data = structuredClone({
	// 	...mapValues(schema.resources, (_, resType) =>
	// 		mapValues(resources[resType] ?? {}, (res, resId) => ({
	// 			[TYPE]: resType,
	// 			[ID]: resId,
	// 			...res.attributes,
	// 			...res.relationships,
	// 		})),
	// 	),
	// });

	// Object.entries(data).forEach(([resType, ressById]) => {
	// 	Object.entries(ressById).forEach(([resId, res]) => {
	// 		res[TYPE] = resType;
	// 		res[ID] = resId;

	// 		const resDef = schema.resources[resType];
	// 		Object.entries(resDef.relationships).forEach(([relName, relDef]) => {
	// 			if (!res[relName]) return;

	// 			relDef.cardinality === "many"
	// 				? (res[relName] = res[relName].map(({ type, id }) => data[type][id]))
	// 				: (res[relName] = data[res[relName].type][res[relName].id] ?? null);
	// 		});
	// 	});
	// });

	return {
		data,
		getTree<Q extends SingleRootQuery<S>>(query: Q, args = {}) {
			const fullQuery = { ...query, ...args };
			const compiled = compileQuery(fullQuery, {
				schema: compiledSchema,
				expressionEngine,
			});

			return runTreeQuery(compiled, { config: fullConfig, schema, data });
		},
		getTrees<Q extends MultiRootQuery<S>>(query: Q, args = {}) {
			const fullQuery = { ...query, ...args };
			const compiled = compileQuery(fullQuery, {
				schema: compiledSchema,
				expressionEngine,
			});

			return runTreeQuery(compiled, { config: fullConfig, schema, data });
		},
		setResource(type, id, value) {
			// TODO: handle inverses?
			const existing = data[type][id] ?? {};

			data[type][id] = { ...existing, ...value };
		},
	};
}
