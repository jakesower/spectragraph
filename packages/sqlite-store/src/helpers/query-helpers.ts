import { Query, RootQuery, Schema } from "@data-prism/store-core";
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
	const go = (query: Query<S>, type, path, parent = null, parentRelationship = null) => {
		const resDef = schema.resources[type];
		const [propertiesEntries, relationshipsEntries] = partition(
			Object.entries(query.properties ?? {}),
			([, propVal]) =>
				typeof propVal === "string" && (propVal in resDef.properties || propVal === "id"),
		);

		const properties = propertiesEntries.map((pe) => pe[1]);
		const relationshipKeys = relationshipsEntries.map((pe) => pe[0]);

		const level = {
			parent,
			parentQuery: parent?.query ?? null,
			parentRelationship,
			path,
			properties,
			query,
			ref: !query.properties,
			relationships: pick(query.properties, relationshipKeys),
			type,
		};
		console.log("level", level);

		return [
			level,
			...relationshipKeys.flatMap((relKey) => {
				const relDef = resDef.relationships[relKey];
				const subquery = query.properties[relKey] as Query<S>;

				return go(subquery, relDef.resource, [...path, relKey], level, relKey);
			}),
		];
	};

	return go(rootQuery, rootQuery.type, []);
}
