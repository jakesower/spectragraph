import { mapValues } from "lodash-es";
import { Schema, compileSchema } from "../schema.js";
import {
	MultiRootQuery,
	RootQuery,
	SingleRootQuery,
	ensureValidQuery,
} from "../query.js";
import { Result } from "../result.js";
import { runTreeQuery } from "./graph-query-operations.js";

export type Graph<S extends Schema> = {
	getTree: <Q extends SingleRootQuery<S>>(query: Q) => Result<Q>;
	getTrees: <Q extends MultiRootQuery<S>>(query: Q) => Result<Q>;
};

export function createGraph<S extends Schema>(schema: S, resources) {
	const compiledSchema = compileSchema(schema);
	const data = { ...mapValues(schema.resources, () => ({})), ...resources };

	return {
		getTree<Q extends SingleRootQuery<S>>(query: Q, args = {}) {
			const fullQuery = { ...query, ...args };
			ensureValidQuery(compiledSchema, fullQuery);
			return runTreeQuery(fullQuery, { schema, data });
		},
		getTrees<Q extends MultiRootQuery<S>>(query: Q, args = {}) {
			const fullQuery = { ...query, ...args };
			ensureValidQuery(compiledSchema, fullQuery);
			return runTreeQuery(fullQuery, { schema, data });
		},
	};
}
