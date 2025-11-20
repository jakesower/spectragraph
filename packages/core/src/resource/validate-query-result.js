import { mapValues } from "es-toolkit";
import { defaultSelectEngine, defaultValidator } from "../lib/defaults.js";
import { createDeepCache, ensure, translateAjvErrors } from "../lib/helpers.js";
import { normalizeQuery } from "../query.js";
import { validateSchema } from "../schema.js";

const getNormalResourceCache = createDeepCache();

/**
 * Validates a query result. This function can be quite slow. It's recommended for use mostly in testing.
 *
 * @param {import('./schema.js').Schema} schema - The schema to validate against
 * @param {import('./query.js').RootQuery} query - The query run to produce the result
 * @param {Object|Object[]} result - The resource tree to validate
 * @param {Object} [options]
 * @param {Ajv} [options.validator] - The validator instance to use
 * @param {import('./lib/defaults.js').SelectExpressionEngine} [options.selectEngine] - Expression engine for SELECT clause validation
 * @return {import('./lib/helpers.js').StandardError[]}
 */
export function validateQueryResult(schema, query, result, options = {}) {
	const { selectEngine = defaultSelectEngine, validator = defaultValidator } =
		options;

	ensure(validateSchema)(schema, options);

	if (typeof validator !== "object") {
		return [
			{
				message: "Invalid validator: expected object, got " + typeof validator,
			},
		];
	}
	if (typeof selectEngine !== "object") {
		return [
			{
				message:
					"Invalid selectEngine: expected object, got " + typeof validator,
			},
		];
	}
	if (typeof query !== "object") {
		return [{ message: "Invalid query: expected object, got " + typeof query }];
	}
	// check for the special case of a null result to improve error quality
	if (query.id && result === null) {
		return [];
	}

	const normalQuery = normalizeQuery(schema, query);

	const cache = getNormalResourceCache(schema, validator, normalQuery);
	let schemaCache = cache;
	let compiledValidator = schemaCache.value;

	if (!compiledValidator) {
		let queryDefinition;

		const selectDefinition = (query) => ({
			type: "object",
			additionalProperties: false,
			properties: mapValues(query.select, (def, prop) => {
				const resDef = schema.resources[query.type];

				if (selectEngine.isExpression(def)) return {};

				if (typeof def === "string") {
					return { ...resDef.attributes[def] };
				}

				const relDef = resDef.relationships[prop];
				return relDef.cardinality === "one"
					? { oneOf: [queryDefinition(def), { type: "null" }] }
					: { type: "array", items: queryDefinition(def) };
			}),
		});

		const nestedGroupDefinition = (groupQuery) =>
			groupQuery.group
				? nestedGroupDefinition(groupQuery.group)
				: {
						type: "object",
						additionalProperties: false,
						required: Object.keys(groupQuery.aggregates),
						properties: {
							...mapValues(groupQuery.select, () => ({})),
							...mapValues(groupQuery.aggregates, () => ({})),
						},
					};

		const baseGroupDefinition = (query) =>
			query.group.group
				? nestedGroupDefinition(query.group.group)
				: {
						type: "object",
						additionalProperties: false,
						required: Object.keys(query.group.aggregates),
						properties: {
							...mapValues(query.group.select, (def) => {
								const resDef = schema.resources[query.type];
								return selectEngine.isExpression(def)
									? {}
									: resDef.attributes[def];
							}),
							...mapValues(query.group.aggregates, () => ({})),
						},
					};

		queryDefinition = (query) =>
			query.select ? selectDefinition(query) : baseGroupDefinition(query);

		const validationSchema = normalQuery.id
			? queryDefinition(normalQuery)
			: {
					type: "array",
					items: queryDefinition(normalQuery),
				};

		compiledValidator = validator.compile(validationSchema);
		cache.set(compiledValidator);
	}

	return compiledValidator(result)
		? []
		: translateAjvErrors(compiledValidator.errors, result, "resource");
}
