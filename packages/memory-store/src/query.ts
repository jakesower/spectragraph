import { difference } from "lodash-es";
import { createEvaluator } from "@data-prism/expression";
import { Schema } from "./schema.js";

export type Subquery = {
	id?: string;
	properties: {
		[k: string]: Subquery;
	};
};

export type Query = Subquery & {
	type: string;
};

export function ensureValidQuery(schema: Schema, rootQuery: Query): void {
	if (!rootQuery.type) {
		throw new Error("queries must have a `type` associated with them");
	}

	const go = (resType: string, query: Subquery) => {
		const resDef = schema.resources[resType];

		if (!resDef) {
			throw new Error(
				`${resType} is not a valid resource type and was supplied in the query`,
			);
		}

		if (!query.properties) return;

		const invalidProps = difference(Object.keys(query.properties), [
			"id",
			...Object.keys({ ...resDef.properties, ...resDef.relationships }),
		]);

		if (invalidProps.length > 0) {
			throw new Error(
				`Invalid prop(s) present in subquery: ${invalidProps.join(
					", ",
				)}. Query: ${JSON.stringify(query)}`,
			);
		}

		// ensure valid subqueries
		Object.entries(query.properties).forEach(([propName, propArgs]) => {
			if (propName in resDef.relationships) {
				go(resDef.relationships[propName].resource, propArgs);
			}
		});
	};

	go(rootQuery.type, rootQuery);
}

export const evaluators = {
	id: createEvaluator({}),
};

export function evaluateId(expression, args) {
	return evaluators.id.evaluate(expression, args);
}
