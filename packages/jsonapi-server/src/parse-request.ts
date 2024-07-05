export function parseRequest(schema, params) {
	const { type, id, fields } = params;
	const resDef = schema.resources[type];

	return {
		type,
		id,
		select: fields?.[type]?.split(",") ?? Object.keys(resDef.attributes),
	};
}
