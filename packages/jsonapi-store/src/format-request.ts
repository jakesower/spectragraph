import { forEachQuery, normalizeQuery } from "@data-prism/core"
import { RootQuery } from "data-prism/dist/query";
import { uniq } from "lodash-es";

type Config = {
	baseURL: string;
};

const objectToParamStr = (obj, rootKey) => {
	const go = (cur) =>
		Object.entries(cur).flatMap(([k, v]) =>
			Array.isArray(v)
				? `[${k}]=[${v.join(",")}]`
				: typeof v === "object"
				? `[${k}]${go(v)}`
				: `[${k}]=${v}`,
		);

	return go(obj)
		.map((x) => `${rootKey}${x}`)
		.join("&");
};

export function formatRequest(schema, config: Config, query: RootQuery) {
	const normalizedQuery = normalizeQuery(query);
	const fields: { [k: string]: string[] } = {};
	const include: string[] = [];
	const filters: { [k: string]: any } = {};

	// fields and where/filter
	forEachQuery(schema, query, (subquery, info) => {
		if (info.parent) {
			include.push(info.path.join("."));
		}

		fields[info.type] = [...(fields[info.type] ?? []), ...info.attributes];

		if (subquery.where) {
			Object.entries(subquery.where).forEach(([field, filter]) => {
				const k = [...info.path, field].join(".");
				filters[k] = filter;
			});
		}
	});

	const fieldsStr = Object.entries(fields)
		.map(([type, vals]) => `fields[${type}]=${uniq(vals).join(",")}`)
		.join("&");

	const includeStr = include.length > 0 && `include=${include.join(",")}`;

	const sortStr =
		query.order &&
		`sort=${normalizedQuery.order
			.map((q) =>
				Object.entries(q).map(([attr, dir]) =>
					dir === "asc" ? attr : `-${attr}`,
				),
			)
			.join(",")}`;

	const { limit, offset = 0 } = query;
	const pageStr =
		limit &&
		objectToParamStr(
			{
				number: Math.floor(offset / limit) + 1,
				size: limit + (offset % limit),
			},
			"page",
		);

	const filterStr =
		Object.keys(filters).length > 0 && objectToParamStr(filters, "filter");

	const paramStr = [fieldsStr, includeStr, sortStr, pageStr, filterStr]
		.filter(Boolean)
		.join("&");
	const path = `${query.type}${query.id ? `/${query.id}` : ""}`;

	return `${config.baseURL}/${path}?${paramStr}`;
}
