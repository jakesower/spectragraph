import { Query, RootQuery, Schema } from "@data-prism/core";
import { partition, pick } from "lodash-es";

type QueryBreakdown<S extends Schema> = {
	path: string[];
	attributes: any;
	relationships: any;
	type: string & keyof S["resources"];
}[];

export function flattenQuery<S extends Schema>(
	schema: S,
	rootQuery: RootQuery<S>,
): QueryBreakdown<S> {
	const go = (query: Query<S>, type, path, parent = null, parentRelationship = null) => {
		const resDef = schema.resources[type];
		const [attributesEntries, relationshipsEntries] = partition(
			Object.entries(query.select ?? {}),
			([, propVal]) =>
				typeof propVal === "string" && (propVal in resDef.attributes || propVal === "id"),
		);

		const attributes = attributesEntries.map((pe) => pe[1]);
		const relationshipKeys = relationshipsEntries.map((pe) => pe[0]);

		const level = {
			parent,
			parentQuery: parent?.query ?? null,
			parentRelationship,
			path,
			attributes,
			query,
			ref: !query.select,
			relationships: pick(query.select, relationshipKeys),
			type,
		};

		return [
			level,
			...relationshipKeys.flatMap((relKey) => {
				const relDef = resDef.relationships[relKey];
				const subquery = query.select[relKey] as Query<S>;

				return go(subquery, relDef.type, [...path, relKey], level, relKey);
			}),
		];
	};

	return go(rootQuery, rootQuery.type, []);
}
