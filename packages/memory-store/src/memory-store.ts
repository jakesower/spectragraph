import { mapValues, merge } from "lodash-es";
import { QueryOfType, RootQuery, ensureValidQuery } from "./query.js";
import { Schema, compileSchema } from "./schema.js";
import { Result } from "./result.js";
import { runQuery } from "./operations.js";
import { project } from "./projection.js";

export type InternalStore = { [k: string]: { [k: string]: any } };

type GetQueryOfType<S extends Schema> = RootQuery<S> extends { type: infer ResType }
	? ResType extends string
		? QueryOfType<S, ResType>
		: never
	: never;

export type Store<S extends Schema> = {
	compileQuery: <Q extends RootQuery<S>>(
		query: RootQuery<S>,
	) => (args?: object) => Promise<Result<Q>>;
	get: <Q extends GetQueryOfType<S>>(query: Q, args?: object) => Promise<Result<Q>>;
	getProjection: (
		query: GetQueryOfType<S>,
		projection: object,
		args?: object,
	) => Promise<{ [k: string]: any }[]>;
	seed: (seedData: object) => void;
};

export function createMemoryStore<S extends Schema>(schema: S): Store<S> {
	const compiledSchema = compileSchema(schema);
	const store: InternalStore = mapValues(schema.resources, () => ({}));

	const seed = (seedData) => {
		merge(store, seedData); // mutates
	};

	const get = (query: RootQuery<S>, args = {}) => {
		ensureValidQuery(compiledSchema, query);
		return Promise.resolve(runQuery(query, { schema: compiledSchema, store }));
	};

	const getProjection = (query: RootQuery<S>, projection: object, args = {}) => {
		ensureValidQuery(compiledSchema, query);

		const results = runQuery(query, { schema: compiledSchema, store });
		return Promise.resolve(project(results, projection));
	};

	const compileQuery = (query: RootQuery<S>) => {
		ensureValidQuery(compiledSchema, query);
		return (args = {}) =>
			Promise.resolve(runQuery({ ...query, ...args }, { schema: compiledSchema, store }));
	};

	return { compileQuery, get, getProjection, seed };
}
