import { Schema } from "data-prism";
import { defaultExpressionEngine } from "@data-prism/expressions";
import JSON5 from "json5";
import { mapValues } from "lodash-es";

const casters = {
	string: (x) => x,
	number: (x) => Number(x),
	integer: (x) => Number(x),
};

export function parseRequest(schema: Schema, params) {
	const parsedInclude = params.include?.split(",") ?? [];

	const go = (type, path = []) => {
		const { id, fields, filter, sort, page } = params;
		const resDef = schema.resources[type];

		const included = parsedInclude.filter(
			(i) => path.length === 0 || i.startsWith(`${path.join(".")}.`),
		);

		const select = [
			...(fields?.[type]
				? [...fields?.[type]?.split(","), resDef.idField ?? "id"]
				: Object.keys(resDef.attributes)),
			...included.map((related) => ({
				[related]: go(resDef.relationships[related].type, [...path, related]),
			})),
		];

		const castFilters = mapValues(filter ?? {}, (param, key) => {
			if (defaultExpressionEngine.isExpression(param)) {
				return param;
			}

			try {
				const parsed = JSON5.parse(param);
				if (defaultExpressionEngine.isExpression(parsed)) {
					return parsed;
				}
			} catch {}

			const attrType = resDef.attributes[key].type;
			return casters[attrType] ? casters[attrType](param) : param;
		});

		const order = sort
			? sort.split(",").map((field) => {
					const parsedField = field[0] === "-" ? field.slice(1) : field;
					if (!Object.keys(resDef.attributes).includes(parsedField)) {
						throw new Error(
							`${parsedField} is not a valid attribute of ${type}`,
						);
					}

					return { [parsedField]: field[0] === "-" ? "desc" : "asc" };
			  })
			: null;

		const limit = page?.size ? Number(page.size) : null;
		const offset = page?.number
			? (Number(page.number) - 1) * Number(page?.size ?? 1)
			: null;

		return {
			...(path.length === 0 ? { type } : {}),
			...(id ? { id } : {}),
			select,
			...(filter ? { where: castFilters } : {}),
			...(order ? { order } : {}),
			...(limit ? { limit } : {}),
			...(offset ? { offset } : {}),
		};
	};

	return go(params.type);
}
