import { defaultExpressionEngine } from "json-expressions";
import JSON5 from "json5";
import { mapValues, pickBy, uniq } from "es-toolkit";

const casters = {
	boolean: (x) => x === "true",
	number: (x) => Number(x),
	integer: (x) => Number(x),
};

const castFilterValue = (type, val) => {
	if (!casters[type]) return val;

	const parsed =
		typeof val === "string" && val.match(/^\[.*\]$/)
			? val.slice(1, -1).split(",")
			: val;

	return Array.isArray(parsed)
		? parsed.map(casters[type])
		: typeof val === "object"
			? mapValues(val, (v) => castFilterValue(type, v))
			: casters[type](val);
};

/**
 * Parses JSON:API request parameters into a SpectraGraph query
 * @param {import("@spectragraph/core").Schema} schema - The schema defining resources
 * @param {*} params - Request parameters from Express
 * @returns {import("@spectragraph/core").RootQuery} Parsed query object
 */
export function parseRequest(schema, params) {
	const parsedInclude = params.include?.split(",") ?? [];

	const go = (type, path = []) => {
		const { id, fields, filter, sort, page } = params;
		const resDef = schema.resources[type];

		const relevantFilters = pickBy(
			filter ?? {},
			(f, k) =>
				(path.length === 0 && !k.includes(".")) ||
				(k.startsWith(`${path.join(".")}.`) &&
					!k.split(`${path.join(".")}.`)[1].includes(".")),
		);

		const parsedFilters = {};
		Object.entries(relevantFilters).forEach(([key, val]) => {
			parsedFilters[
				path.length === 0 ? key : key.split(`${path.join(".")}.`)[1]
			] = val;
		});

		const castFilters = mapValues(parsedFilters, (param, key) => {
			const attrType = resDef.attributes[key].type;

			if (defaultExpressionEngine.isExpression(param)) {
				return castFilterValue(attrType, param);
			}

			try {
				const parsed = JSON5.parse(param);
				if (defaultExpressionEngine.isExpression(parsed)) {
					return castFilterValue(attrType, parsed);
				}
			} catch {
				// noop
			}

			return castFilterValue(attrType, param);
		});

		const included = parsedInclude
			.filter(
				(i) =>
					(path.length === 0 && !i.includes(".")) ||
					(i.startsWith(`${path.join(".")}.`) &&
						!i.split(`${path.join(".")}.`)[1].includes(".")),
			)
			.map((i) => (path.length === 0 ? i : i.split(`${path.join(".")}.`)[1]));

		const select = [
			...(fields?.[type]
				? uniq([
						...fields[type].split(","),
						resDef.idAttribute ?? "id",
						...Object.keys(parsedFilters ?? {}),
					])
				: Object.keys(resDef.attributes)),
			...included.map((related) => ({
				[related]: go(resDef.relationships[related].type, [...path, related]),
			})),
		];

		const order =
			sort && path.length === 0
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
			...(path.length === 0 && id ? { id } : {}),
			select,
			...(Object.keys(relevantFilters).length > 0
				? { where: castFilters }
				: {}),
			...(order ? { order } : {}),
			...(limit ? { limit } : {}),
			...(offset ? { offset } : {}),
		};
	};

	return go(params.type);
}
