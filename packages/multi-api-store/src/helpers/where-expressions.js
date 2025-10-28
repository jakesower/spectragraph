import { mapValues, toMerged } from "es-toolkit";

function looksLikeExpression(val) {
	return (
		val !== null &&
		typeof val === "object" &&
		!Array.isArray(val) &&
		Object.keys(val).length === 1 &&
		Object.keys(val)[0].startsWith("$")
	);
}

function isWrappedLiteral(val) {
	return (
		val &&
		typeof val === "object" &&
		Object.keys(val).length === 1 &&
		"$literal" in val
	);
}

const DEFAULT_HANDLERS = {
	$and: (operand, context, { apply }) =>
		operand.reduce((acc, pred) => ({ ...acc, ...apply(pred, context) }), {}),
	$get: (operand, context) => ({ ...context, attribute: operand }),
	$matchesAll: (operand, context, { apply, isWrappedLiteral }) =>
		Object.entries(operand)
			.map(([attribute, expression]) =>
				isWrappedLiteral(expression)
					? apply({ $eq: expression.$literal }, { ...context, attribute })
					: looksLikeExpression(expression)
						? apply(expression, { ...context, attribute })
						: apply({ $eq: expression }, { ...context, attribute }),
			)
			.reduce(toMerged, {}),
	$or: (operand, context, { apply }) =>
		operand.length === 1 ? apply(operand[0], context) : {},
	$pipe: (operand, context, { apply }) =>
		operand.reduce((acc, expr) => apply(expr, acc), context),
};

/**
 *
 * @param {Object} expressions
 * @returns {Object} an object of query parameters to be pushed down to the APIs
 *
 * This is a specialized version of the json-expressions evaluator. Its job is
 * to get an object of query parameters. It *ignores* unknown expressions rather
 * than erroring out, returning an empty query parameter object.
 */
function createExpressionWalker(expressions) {
	const isExpression = (val) =>
		looksLikeExpression(val) && Object.keys(val)[0] in expressions;

	const apply = (val, context) => {
		if (looksLikeExpression(val)) {
			if (isWrappedLiteral(val)) return val;

			if (isExpression(val)) {
				const expressionName = Object.keys(val)[0];
				const operand = val[expressionName];
				const expressionDef = expressions[expressionName];

				return expressionDef(operand, context, {
					apply,
					isExpression,
					isWrappedLiteral,
				});
			}

			return {}; // no params
		}

		return Array.isArray(val)
			? val.map((v) => apply(v, context))
			: val !== null && typeof val === "object"
				? mapValues(val, (v) => apply(v, context))
				: val;
	};

	return { apply };
}

/**
 * Wraps a 2-parameter expression handler to auto-resolve its operand before calling it.
 *
 * Expression handlers can use two signatures:
 * - 2-parameter: `(resolvedValue, context)` - operand is automatically resolved
 * - 3-parameter: `(operand, context, execContext)` - full control, manual resolution
 *
 * @param {Function} fn - A 2-parameter expression handler
 * @returns {Function} A 3-parameter expression handler with auto-resolved operand
 */
const withResolvedOperand = (fn) => (operand, context, execContext) => {
	const resolved = execContext.apply(operand, context);
	return fn(resolved, context, execContext);
};

/**
 * Creates a where-clause pushdown engine that converts query expressions into
 * API-specific query parameters.
 *
 * Expression handlers receive:
 * - operand: The expression's operand value
 * - context: Object containing `attribute` and other contextual data
 * - execContext: Object with `{ apply, isExpression, isWrappedLiteral }` helpers
 *
 * Handlers can use two signatures:
 * - **2-parameter**: `(resolvedValue, context)` - the operand is automatically resolved
 *   before being passed. Use this for simple transformations.
 *   Example: `$gt: (value, { attribute }) => ({ [\`\${attribute}_gt\`]: value })`
 *
 * - **3-parameter**: `(operand, context, execContext)` - receives the raw operand
 *   and must manually call `execContext.apply()` to resolve nested expressions.
 *   Use this when you need control over resolution order or behavior.
 *   Example: `$gt: (operand, context, { apply }) => { const resolved = apply(operand, context); ... }`
 *
 * @param {Object} defs - Map of expression names to handler functions
 * @returns {Object} An expression walker with an `apply(expression, context)` method
 *
 * @example
 * // Simple 2-parameter handlers (auto-resolved)
 * createWherePushdownEngine({
 *   $eq: (value, { attribute }) => ({ [attribute]: value }),
 *   $gt: (value, { attribute }) => ({ [`${attribute}_gt`]: value })
 * })
 *
 * @example
 * // 3-parameter handler with manual control
 * createWherePushdownEngine({
 *   $gt: (operand, context, { apply }) => {
 *     const [attr, value] = apply(operand, context);
 *     return { [`${attr.attribute}_gt`]: value };
 *   }
 * })
 */
export function createWherePushdownEngine(defs) {
	const definitions = {
		...DEFAULT_HANDLERS,
		...mapValues(defs, (def) =>
			def.length === 3 ? def : withResolvedOperand(def),
		),
	};

	return createExpressionWalker(definitions);
}

/**
 * Converts string templates into expression handler functions for URL query parameters.
 *
 * Templates use `${attribute}` and `${value}` placeholders to define the query parameter
 * format. The resulting functions return objects that will be stringified by
 * `stringifyQueryParams` to produce the final URL.
 *
 * @param {Object} templatesObj - Map of expression names to template strings
 * @returns {Object} Map of expression names to handler functions
 *
 * @example
 * pathTemplates({
 *   $eq: "${attribute}=${value}",
 *   $gt: "${attribute}_gt=${value}",
 *   $custom: "${attribute}=custom(${value})"
 * })
 * // Creates handlers that produce:
 * // { location: "Utah" } -> ?location=Utah
 * // { established_gt: 1910 } -> ?established_gt=1910
 * // { age: "custom(18)" } -> ?age=custom(18)
 */
export function pathTemplates(templatesObj) {
	return mapValues(templatesObj, (template) => (value, context) => {
		const subbed = template
			.replaceAll("${attribute}", context.attribute)
			.replaceAll("${value}", value);

		const [keyPart, valuePart] = subbed.split("=");
		return { [keyPart]: valuePart };
	});
}
