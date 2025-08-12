import { get } from "lodash-es";

// errors on the select clause are the most complex and need more intensive formatting
export function formatSelectError(error, query, schema, expressionEngine) {
	const cleanPath = error.instancePath.split("/").slice(1);
	const problemSelect = get(query, cleanPath);

	const resType = cleanPath
		.filter((p) => p !== "select" && !/^[0-9]$/.test(p))
		.reduce(
			(acc, rel) => schema.resources[acc].relationships[rel].type,
			query.type,
		);
	const resSchema = schema.resources[resType];

	if (typeof problemSelect === "string" && problemSelect !== "*") {
		return {
			...error,
			message: `query${error.instancePath} ${problemSelect} is a string and therefore must be "*" -- perhaps you meant ["${problemSelect}"]`,
			keyword: "errorMessage",
		};
	}

	const errors = [];
	Object.entries(problemSelect).forEach(([key, val]) => {
		if (resSchema.relationships[key]) {
			errors.push({
				...error,
				message: `query${error.instancePath}/${key} must have a valid subquery as its value`,
				keyword: "errorMessage",
			});
		}

		if (
			typeof val === "object" &&
			!Array.isArray(val) &&
			!expressionEngine.isExpression(val)
		) {
			errors.push({
				...error,
				message: `the "${key}" key is an object and therefore must be a valid data prism expression (if you meant to have a relationship with a subquery, check your spelling)`,
				keyword: "errorMessage",
			});
		}
	});

	return errors.length > 0 ? errors : [error];
}

export function formatSelectErrors(
	rawSelectErrors,
	query,
	schema,
	expressionEngine,
) {
	return rawSelectErrors.flatMap((error) =>
		formatSelectError(error, query, schema, expressionEngine),
	);
}
