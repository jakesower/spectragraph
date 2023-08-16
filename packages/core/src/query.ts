import { difference } from "lodash-es";
import { defaultExpressionEngine } from "@data-prism/expressions";
import { Schema } from "./schema.js";

export type Query<S extends Schema> = {
	id?: string;
	limit?: number;
	offset?: number;
	order?: { property: string; direction: "asc" | "desc" }[];
	properties?: {
		[k: string]: string | object;
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

export type BaseRootQuery<S extends Schema> = Query<S> & {
	type: keyof S["resources"] & string;
};

export type MultiRootQuery<S extends Schema> = BaseRootQuery<S> & { id?: never };
export type SingleRootQuery<S extends Schema> = BaseRootQuery<S> & {
	id: string | number;
};
export type RootQuery<S extends Schema> = MultiRootQuery<S> | SingleRootQuery<S>;

export function ensureValidQuery<S extends Schema>(
	rootQuery: RootQuery<S>,
	config: { schema: S; expressionEngine: any },
): void {
	const { schema, expressionEngine } = config;

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

		const shallowPropValues = Object.values(query.properties).filter(
			(p) => typeof p === "string" && !p.includes("."),
		);
		const invalidShallowProps = difference(shallowPropValues, [
			resDef.idField,
			...Object.keys({ ...resDef.properties, ...resDef.relationships }),
		]);

		if (invalidShallowProps.length > 0) {
			throw new Error(
				`Invalid prop(s) present in subquery: ${invalidShallowProps.join(
					", ",
				)}. Query: ${JSON.stringify(query)}`,
			);
		}

		const relationshipPropKeys = Object.keys(query.properties).filter(
			(k) =>
				typeof query.properties[k] === "object" &&
				!expressionEngine.isExpression(query.properties[k]),
		);
		const invalidRelationshipProps = difference(
			relationshipPropKeys,
			Object.keys(resDef.relationships),
		);
		if (invalidRelationshipProps.length > 0) {
			throw new Error(
				`Invalid relationship(s) present in subquery: ${invalidRelationshipProps.join(
					", ",
				)}. Query: ${JSON.stringify(query)}`,
			);
		}

		// ensure valid subqueries
		Object.entries(query.properties).forEach(([propName, propArgs]) => {
			if (propName in resDef.relationships) {
				go(resDef.relationships[propName].resource, propArgs as object);
			}
		});
	};

	go(rootQuery.type, rootQuery);
}

export const evaluators = {
	id: defaultExpressionEngine,
	where: defaultExpressionEngine,
};

export function evaluateId(expression, args) {
	return defaultExpressionEngine.apply(expression, args);
}
