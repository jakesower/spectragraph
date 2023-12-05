import { mapValues, pick } from "lodash-es";
import { Schema, compileSchema } from "./schema.js";
import {
	MultiRootQuery,
	SingleRootQuery,
	compileQuery,
} from "./query.js";
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
	linkInverses: boolean;
	omittedOperations: string[];
};

type ResourceGraph = {
	type: string;
	id: string | number;
	attributes: { [k: string]: unknown };
	relationships: {
		[k: string] : {
			type: string;
			id: string | number;
		}
	}
}

const defaultConfig: GraphConfig = {
	expressionEngine: defaultExpressionEngine,
	linkInverses: false,
	omittedOperations: [],
};

export function createGraph<S extends Schema>(
	schema: S,
	resources,
	config: Partial<GraphConfig> = {},
): Graph<S> {
	const compiledSchema = compileSchema(schema);
	const fullConfig: GraphConfig = { ...defaultConfig, ...config };
	const { expressionEngine } = fullConfig;

	// subject to mutations; for internal use only
	const workingData = structuredClone({
		...mapValues(schema.resources, (_, resType) => resources[resType] ?? {}),
	});

	const runQuery = (query) => {

	};

	return {
		data: resources,
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
	};
}
