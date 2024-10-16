import { difference, mapValues, partition, pick } from "lodash-es";
import { defaultExpressionEngine } from "@data-prism/expressions";
import { Schema } from "./schema.js";

export type Query<S extends Schema> = {
	id?: string;
	limit?: number;
	offset?: number;
	order?: { [k: string]: "asc" | "desc" } | { [k: string]: "asc" | "desc" }[];
	select:
		| readonly (string | { [k: string]: string | object })[]
		| {
				[k: string]: string | object;
		  };
	type?: keyof S["resources"] & string;
	where?: { [k: string]: any };
};

export type BaseRootQuery<S extends Schema> = Query<S> & {
	type: keyof S["resources"] & string;
};

export type MultiRootQuery<S extends Schema> = BaseRootQuery<S> & { id?: never };
export type SingleRootQuery<S extends Schema> = BaseRootQuery<S> & {
	id: string;
};
export type RootQuery<S extends Schema> = MultiRootQuery<S> | SingleRootQuery<S>;

export type CompiledQuery<S extends Schema> = {
	id?: string;
	limit?: number;
	offset?: number;
	order?: { [k: string]: "asc" | "desc" } | { [k: string]: "asc" | "desc" }[];
	select?: {
		[k: string]: string | object;
	};
	type?: keyof S["resources"] & string;
	where?: { [k: string]: any };
};

export type CompiledRootQuery<S extends Schema> = CompiledQuery<S> & {
	type: keyof S["resources"] & string;
};

type QueryBreakdown<S extends Schema> = {
	isRefQuery: boolean;
	query: Query<S>;
	parent: QueryBreakdown<S> | null;
	parentRelationship: string | null;
	path: string[];
	properties: any;
	relationships: any;
	type: string & keyof S["resources"];
};

export function ensureValidQuery<S extends Schema>(
	rootQuery: RootQuery<S>,
	config: { schema: S; expressionEngine?: any },
): void {
	const { schema, expressionEngine = defaultExpressionEngine } = config;

	if (!rootQuery.type) {
		throw new Error("queries must have a `type` associated with them");
	}

	const go = (resType: string, query: Query<S>) => {
		const resDef = schema.resources[resType];
		const { select } = query;

		if (!resDef) {
			throw new Error(
				`${resType} is not a valid resource type and was supplied in the query`,
			);
		}

		if (!select) throw new Error("select is a required field on queries");

		const shallowPropValues = Object.values(select).filter(
			(p) => typeof p === "string" && !p.includes("."),
		);
		const invalidShallowProps = difference(shallowPropValues, [
			resDef.idAttribute,
			...Object.keys({ ...resDef.attributes, ...resDef.relationships }),
		]);

		if (invalidShallowProps.length > 0) {
			throw new Error(
				`Invalid prop(s) present in subquery: ${invalidShallowProps.join(
					", ",
				)}. Query: ${JSON.stringify(query)}`,
			);
		}

		const relationshipPropKeys = Object.keys(select).filter(
			(k) => typeof select[k] === "object" && !expressionEngine.isExpression(select[k]),
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
		Object.entries(select).forEach(([propName, propArgs]) => {
			if (propName in resDef.relationships && (typeof propArgs === "object")) {
				go(resDef.relationships[propName].type, propArgs as Query<S>);
			}
		});
	};

	go(rootQuery.type, rootQuery);
}

export function compileQuery<S extends Schema>(
	rootQuery: RootQuery<S>,
	config: { schema: S; expressionEngine?: any },
): CompiledRootQuery<S> {
	const defaultedExpressionEngine = config.expressionEngine ?? defaultExpressionEngine;
	const stringToProp = (str) => ({ [str]: str });
	const go = (query) => {
		const { select } = query;
		const selectObj = Array.isArray(select)
			? select.reduce((selectObj, item) => {
				const subObj = typeof item === "string" ? stringToProp(item) : item;
				return { ...selectObj, ...subObj };
			  }, {})
			: select;

		const subqueries = mapValues(selectObj, (sel) =>
			(typeof sel === "object" && !defaultedExpressionEngine.isExpression(sel))
				? go(sel)
				: sel,
		);

		return { ...query, select: subqueries };
	};

	const compiled = go(rootQuery);
	ensureValidQuery(compiled, config);
	return compiled;
}

export function flattenQuery<S extends Schema>(
	schema: S,
	rootQuery: RootQuery<S>,
): QueryBreakdown<S>[] {
	const go = (
		query: Query<S>,
		type,
		path,
		parent = null,
		parentRelationship = null,
	): QueryBreakdown<S>[] => {
		const resDef = schema.resources[type];
		const { select } = query;

		const [propertiesEntries, relationshipsEntries] = partition(
			Object.entries(select ?? {}),
			([, propVal]) =>
				typeof propVal === "string" && (propVal in resDef.attributes || propVal === "id"),
		);

		const properties = propertiesEntries.map((pe) => pe[1]);
		const relationshipKeys = relationshipsEntries.map((pe) => pe[0]);

		const level: QueryBreakdown<S> = {
			isRefQuery: !select,
			parent,
			parentRelationship,
			path,
			properties,
			query,
			relationships: pick(select, relationshipKeys),
			type,
		};

		return [
			level,
			...relationshipKeys.flatMap((relKey) => {
				const relDef = resDef.relationships[relKey];
				const subquery = select[relKey] as Query<S>;

				return go(subquery, relDef.type, [...path, relKey], level, relKey);
			}),
		];
	};

	return go(rootQuery, rootQuery.type, []);
}

export function createScopedSchema(schema, query) {
	const types = [];
	const propertiesByType = {};
	const relationshipsByType = {};

	const flattenedQuery = flattenQuery(schema, query);
	flattenedQuery.forEach((subquery) => {
		types.push(subquery.type);

		propertiesByType[subquery.type] = propertiesByType[subquery.type] ?? [];

		// properties with paths need special treatment -- TODO
		propertiesByType[subquery.type] = [
			...propertiesByType[subquery.type],
			...subquery.properties,
		];

		relationshipsByType[subquery.type] = relationshipsByType[subquery.type] ?? [];
		relationshipsByType[subquery.type] = [
			...relationshipsByType[subquery.type],
			...Object.keys(subquery.relationships),
		];
	});

	const scopedResources = mapValues(pick(schema.resources, types), (resDef, resType) => ({
		...resDef,
		properties: pick(resDef.properties, propertiesByType[resType]),
		relationships: pick(resDef.relationships, relationshipsByType[resType]),
	}));

	return {
		...schema,
		resources: scopedResources,
	};
}
