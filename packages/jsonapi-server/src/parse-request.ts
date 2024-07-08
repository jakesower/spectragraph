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
	const { type, id, fields, filter } = params;
	const resDef = schema.resources[type];

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

	return {
		type,
		id,
		select: fields?.[type]?.split(",") ?? Object.keys(resDef.attributes),
		...(filter ? { where: castFilters } : {}),
	};
}
