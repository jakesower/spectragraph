import { mapValues } from "lodash-es";

/**
 * @typedef {Object} CompiledExpression
 * @property {string[]} [where] - WHERE clause parts
 * @property {any[]} [vars] - SQL variables/parameters
 */

/**
 * @typedef {Object} CompileContext
 * @property {import('data-prism').RootQuery} query - The query being processed
 * @property {import('data-prism').Schema} schema - The schema
 */

/**
 * @typedef {Object} ConstraintOperatorDef
 * @property {(exprVal: any, compile: Function, context?: CompileContext) => () => CompiledExpression} compile - Compilation function
 * @property {boolean} [preQuery] - Whether this is a pre-query operator
 */

/**
 * Creates a comparative operator definition
 * @param {string} sqlOperator - The SQL operator (=, >, <, etc.)
 * @returns {ConstraintOperatorDef} The operator definition
 */
const comparative = (sqlOperator) => ({
	compile: (exprVal, compile) => () => {
		const [left, right] = exprVal.map((v) => compile(v)());

		return {
			where: [`${left?.where ?? "?"} ${sqlOperator} ${right?.where ?? "?"}`],
			vars: [...(left?.vars ?? [left]), ...(right?.vars ?? [right])],
		};
	},
});

/**
 * Constraint operator definitions for SQL query building
 * @type {Object<string, ConstraintOperatorDef>}
 */
const constraintOperatorDefs = {
	$and: {
		compile: (exprVal, compile) => () => {
			const predicates = exprVal.map((val) => compile(val)());
			const wheres = predicates.map((pred) => pred.where).filter(Boolean);
			if (wheres.length === 0) return {};

			return {
				where: [
					`(${predicates
						.map((pred) => pred.where)
						.filter(Boolean)
						.join(") AND (")})`,
				],
				vars: predicates.flatMap((pred) => pred.vars ?? []),
			};
		},
	},
	$prop: {
		compile: (exprVal, _, { query, schema }) => {
			if (!(exprVal in schema.resources[query.type].properties)) {
				throw new Error("invalid property");
			}

			return () => ({
				where: exprVal,
				vars: [],
			});
		},
	},
	// comparative
	$eq: comparative("="),
	$gt: comparative(">"),
	$gte: comparative(">="),
	$lt: comparative("<"),
	$lte: comparative("<="),
	$ne: comparative("!="),
	$in: {
		compile: (args, compile) => (vars) => {
			const [item, array] = args;
			const itemVal = compile(item)(vars);
			const arrayVals = array.map((arg) => compile(arg)(vars));

			if (array.length === 0) return {};

			return {
				where: `${itemVal.where} IN (${arrayVals.map(() => "?").join(", ")})`,
				vars: arrayVals,
			};
		},
	},
	$nin: {
		compile: (args, compile) => (vars) => {
			const [item, array] = args;
			const itemVal = compile(item)(vars);
			const arrayVals = array.map((arg) => compile(arg)(vars));

			if (array.length === 0) return {};

			return {
				where: `${itemVal.where} NOT IN (${arrayVals.map(() => "?").join(", ")})`,
				vars: arrayVals,
			};
		},
	},
};

/**
 * Constraint operators with preQuery flag added
 * @type {Object<string, ConstraintOperatorDef>}
 */
export const constraintOperators = mapValues(constraintOperatorDefs, (def) => ({
	...def,
	preQuery: true,
}));
