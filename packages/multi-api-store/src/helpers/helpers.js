import { mapValues } from "es-toolkit";

export function compileFormatter(templates, pivot, keys) {
	const fns = mapValues(
		templates,
		(template) => (vars) =>
			keys.reduce((acc, k) => acc.replaceAll(`$\{${k}}`, vars[k]), template),
	);
	return (vars) => fns[vars[pivot]](vars);
}

export function compileWhereFormatter(templates) {
	return compileFormatter(templates, "expressionName", ["attribute", "value"]);
}

export function compileOrderFormatter(templates) {
	return compileFormatter(templates, "direction", ["attribute"]);
}

export function compileResourceMappers(schema, type, mappers) {
	const resSchema = schema.resources[type];
	const mappable = { ...resSchema.attributes, ...resSchema.relationships };
	const fns = mapValues(mappable, (_, name) => {
		if (name in mappers) {
			if (typeof mappers[name] === "function") {
				return mappers[name];
			} else if (typeof mappers[name] === "string") {
				return (val) => val[mappers[name]];
			} else {
				throw new Error("mappers must be functions or strings");
			}
		}

		return (val) => val[name];
	});

	return (resource) =>
		Object.entries(fns).reduce((acc, [key, fn]) => {
			const val = fn(resource);
			return val === undefined ? acc : { ...acc, [key]: val };
		}, {});
}

export function buildAsyncMiddlewarePipe(middleware) {
	const init = (val) => val;
	return middleware.reduceRight((onion, mw) => (val) => mw(val, onion), init);
}
