import { RootQuery, Schema } from "@data-prism/store-core";
import { partition, pick } from "lodash-es";

type QueryBreakdown<S extends Schema> = {
	path: string[];
	properties: any;
	relationships: any;
	type: string & keyof S["resources"];
}[];

export function flattenQuery<S extends Schema>(
	schema: S,
	rootQuery: RootQuery<S>,
): QueryBreakdown<S> {
	const go = (query, type, path, parentQuery = null, parentRelationship = null) => {
		const resDef = schema.resources[type];
		const [properties, relationshipKeys] = partition(
			Object.keys(query.properties ?? {}),
			(propName) => propName in resDef.properties || propName === "id",
		);

		const level = {
			parentQuery,
			parentRelationship,
			path,
			properties,
			query,
			relationships: pick(query.properties, relationshipKeys),
			type,
		};

		return [
			level,
			...relationshipKeys.flatMap((relKey) => {
				const relDef = resDef.relationships[relKey];
				const subquery = query.properties[relKey];

				return go(subquery, relDef.resource, [...path, relKey], query, relKey);
			}),
		];
	};

	return go(rootQuery, rootQuery.type, []);
}
