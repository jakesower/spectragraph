import { difference } from "lodash-es";
import { createExpressionEngine } from "@data-prism/expression";
import { Schema } from "./schema.js";

export type Query<S extends Schema> = {
	id?: string;
	limit?: number;
	offset?: number;
	order?: { property: string; direction: "asc" | "desc" }[];
	properties?: {
		[k: string]: object;
	};
	type?: keyof S["resources"] & string;
	where?: { [k: string]: any };
};

export type QueryOfType<
	S extends Schema,
	ResType extends keyof S["resources"],
> = Query<S> & {
	properties?:
		| {
				[K in keyof S["resources"][ResType]["properties"]]?: any;
		  }
		| { [k: string]: any };
	type: ResType;
};

export type RootQuery<S extends Schema> = Query<S> & {
	type: keyof S["resources"] & string;
};

export function ensureValidQuery<S extends Schema>(
	schema: S,
	rootQuery: RootQuery<S>,
): void {
	if (!rootQuery.type) {
		throw new Error("queries must have a `type` associated with them");
	}

	const go = (resType: string, query: Query<S>) => {
		const resDef = schema.resources[resType];

		if (!resDef) {
			throw new Error(
				`${resType} is not a valid resource type and was supplied in the query`,
			);
		}

		if (!query.properties) return;

		const invalidProps = difference(Object.keys(query.properties), [
			resDef.idField,
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
	id: createExpressionEngine({}),
	where: createExpressionEngine({}),
};

export function evaluateId(expression, args) {
	return evaluators.id.evaluate(expression, args);
}
