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
	const go = (query, resourceType, path, parentQuery = null) => {
		const resDef = schema.resources[resourceType];
		const [properties, relationshipKeys] = partition(
			Object.keys(query.properties ?? {}),
			(propName) => propName in resDef.properties || propName === "id",
		);

		const level = {
			parentQuery,
			path,
			properties,
			relationships: pick(query.properties, relationshipKeys),
			resourceType,
		};

		return [
			level,
			...relationshipKeys.flatMap((relKey) => {
				const relDef = resDef.relationships[relKey];
				const subquery = query.properties[relKey];

				return go(subquery, relDef.resource, [...path, relKey], query);
			}),
		];
	};

	return go(rootQuery, rootQuery.type, []);
}
