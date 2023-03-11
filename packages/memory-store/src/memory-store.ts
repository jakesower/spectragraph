import { mapValues, merge } from "lodash-es";
import { RootQuery, ensureValidQuery } from "./query.js";
import { Schema } from "./schema.js";
import { Result } from "./result.js";
import { runQuery } from "./operations.js";

export type InternalStore = { [k: string]: { [k: string]: any } };

export type Store = {
	compileQuery: (query: RootQuery) => (args?: object) => Promise<Result>;
	get: (query: RootQuery, args?: object) => Promise<Result>;
	seed: (seedData: object) => void;
};

type MemoryStoreOptions = {
	initialData: any;
};

export function createMemoryStore<S extends Schema>(
	schema: S,
	options?: MemoryStoreOptions,
): Store {
	const store: InternalStore = mapValues(schema.resources, () => ({}));

	const seed = (seedData) => {
		merge(store, seedData); // mutates
	};

	const get = (query: RootQuery, args = {}) => {
		ensureValidQuery(schema, query);
		return Promise.resolve(runQuery(query, { schema, store }));
	};

	const compileQuery = (query: RootQuery) => {
		ensureValidQuery(schema, query);
		return (args) => get(query, args);
	};

	return { compileQuery, get, seed };
}
