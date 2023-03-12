import { difference } from "lodash-es";
import { expressionContext } from "@data-prism/expression";
import { Schema } from "./schema.js";

// export type QueryProperty<S extends Schema, ResType extends keyof S["resources"]> = {
// 	[K in keyof S["resources"][ResType]["properties"]]: S["resources"][ResType]["properties"][K] extends { type: "string" };
// };

type Query<S extends Schema> = {
	first?: boolean;
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

export type QueryOfType<S extends Schema, ResType extends keyof S["resources"]> = {
	first?: boolean;
	id?: string;
	limit?: number;
	offset?: number;
	order?: { property: string; direction: "asc" | "desc" }[];
	properties?:
		| {
				[K in keyof S["resources"][ResType]["properties"]]?: any;
		  }
		| { [k: string]: any };
	type: ResType;
	where?: { [k: string]: any };
};

// export type SingularQuery = Query & ({ first: true } | { id: any });

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

		if (query.id && query.first) {
			throw new Error("queries may not have both an `id` and use `first`");
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
	id: expressionContext({}),
	where: expressionContext({}),
};

export function evaluateId(expression, args) {
	return evaluators.id.evaluate(expression, args);
}
