import { mapValues } from "es-toolkit";

export function compileFormatter(templates) {
	const fns = mapValues(
		templates,
		(template) =>
			({ attribute, value }) =>
				template
					.replace(/\${attribute}/g, attribute)
					.replace(/\${value}/g, value),
	);

	return ({ attribute, expressionName, value }) =>
		fns[expressionName]({ attribute, value });
}
