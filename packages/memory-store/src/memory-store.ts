import {
	ensureValidQuery,
	RootQuery,
	SingleRootQuery,
	Schema,
	Result,
	createGraph,
} from "@data-prism/core";
import { defaultExpressionEngine } from "@data-prism/expressions";

export type InternalStore = { [k: string]: { [k: string]: any } };

export type Store<S extends Schema> = {
	compileQuery: <Q extends RootQuery<S>>(
		query: RootQuery<S>,
	) => (args?: object) => Promise<Result<Q>>;
	get: <Q extends RootQuery<S>>(query: Q, args?: object) => Promise<Result<Q>>;
	setState: (data: object) => void;
};

export function createMemoryStore<S extends Schema>(schema: S): Store<S> {
	const expressionEngine = defaultExpressionEngine;

	let graph = createGraph(schema, {}, { expressionEngine });

	const setState = (data) => {
		graph = createGraph(schema, data, { expressionEngine });
	};

	const runQuery = <Q extends RootQuery<S>>(query: Q): Result<Q> => {
		return (
			"id" in query ? graph.getTree(query as SingleRootQuery<S>) : graph.getTrees(query)
		) as Result<Q>;
	};

	const get = (query: RootQuery<S>, args = {}) => {
		const compiledQuery = { ...query, ...args };
		ensureValidQuery(compiledQuery, {
			schema,
			expressionEngine,
		});

		return Promise.resolve(runQuery({ ...query, ...args }));
	};

	const compileQuery = (query: RootQuery<S>) => {
		ensureValidQuery(query, {
			schema,
			expressionEngine,
		});

		return (args = {}) => Promise.resolve(runQuery({ ...query, ...args }));
	};

	return { compileQuery, get, setState };
}
