import { Schema, compileSchema } from "./schema.js";
import { MultiRootQuery, RootQuery, SingleRootQuery, compileQuery } from "./query.js";
import { Result } from "./result.js";
import { runTreeQuery } from "./graph/graph-query-operations.js";
import { ExpressionEngine, defaultExpressionEngine } from "@data-prism/expressions";
import { applyOrMap } from "@data-prism/utils";

type Ref = {
	type: string;
	id: string;
}

type CanonicalGraph = {
	[k: string]: {
		[k: string]: {
			attributes: { [k: string]: unknown };
			relationships: { [k: string]: Ref | Ref[] };
		}
	}
}

export type Graph<S extends Schema> = {
	data: { [k: string]: { [k: string]: any } };
	get: <Q extends RootQuery<S>>(query: Q) => Result<Q>;
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
): Graph<S> {
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

	const get = (query) => {
		const compiled = compileQuery(query, {
			schema: compiledSchema,
			expressionEngine,
		});

		return runTreeQuery(compiled, { schema, data, config: fullConfig });
	};

	return {
		data,
		get,
		getTree<Q extends SingleRootQuery<S>>(query: Q) {
			return get(query);
		},
		getTrees<Q extends MultiRootQuery<S>>(query: Q) {
			return get(query);
		},
	};
}
