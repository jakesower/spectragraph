import { defaultExpressionEngine } from "@data-prism/expressions";
import { mapValues } from "lodash-es";

export type Expression = {
	[k: string]: any;
};

export type Query = {
	id?: string;
	limit?: number;
	offset?: number;
	order?: { [k: string]: "asc" | "desc" } | { [k: string]: "asc" | "desc" }[];
	select:
		| readonly (string | { [k: string]: string | Query | Expression })[]
		| {
				[k: string]: string | Query | Expression;
		  };
	type?: string;
	where?: { [k: string]: any };
};

export type RootQuery = Query & {
	type: string;
};

export type CompiledQuery = Query & {
	select: {
		[k: string]: string | CompiledQuery;
	};
};

export type CompiledRootQuery = RootQuery & CompiledQuery;

export function compileQuery(rootQuery): CompiledRootQuery {
	const stringToProp = (str) => ({ [str]: str });

	const go = (query: Query): CompiledQuery => {
		const { select } = query;
		const selectObj = Array.isArray(select)
			? select.reduce((selectObj, item) => {
					const subObj = typeof item === "string" ? stringToProp(item) : item;
					return { ...selectObj, ...subObj };
				}, {})
			: select;

		const subqueries = mapValues(selectObj, (sel) =>
			typeof sel === "object" && !defaultExpressionEngine.isExpression(sel)
				? go(sel)
				: sel,
		);

		return { ...query, select: subqueries };
	};

	return go(rootQuery) as CompiledRootQuery;
}
