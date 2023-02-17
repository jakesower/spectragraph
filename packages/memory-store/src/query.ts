import { difference } from "lodash-es";
import { createEvaluator } from "@data-prism/expressions";
import { Schema } from "./schema";

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

	const go = (resType: string, subquery: Subquery) => {
		const resDef = schema.resources[resType];

		if (!resDef) {
			throw new Error(
				`${resType} is not a valid resource type and was supplied in the query`,
			);
		}

		if (!subquery.properties) return;

		const invalidProps = difference(Object.keys(subquery.properties), [
			"id",
			...Object.keys({ ...resDef.properties, ...resDef.relationships }),
		]);

		if (invalidProps.length > 0) {
			throw new Error(
				`Invalid prop(s) present in subquery: ${invalidProps.join(
					", ",
				)}. Query: ${JSON.stringify(subquery)}`,
			);
		}

		// ensure valid subqueries
		Object.entries(subquery.properties).filter(([propName, propArgs]) => {
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
