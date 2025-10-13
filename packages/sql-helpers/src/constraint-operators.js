import { mapValues } from "es-toolkit";

/**
 * @typedef {Object} OperatorDefinition
 * @property {Function} compile - Function that compiles the operator expression
 * @property {boolean} [preQuery] - Whether this operator should be evaluated pre-query
 */

/**
 * Creates a comparative operator definition
 * @param {string} sqlOperator - The SQL operator to use (=, >, <, etc.)
 * @returns {OperatorDefinition} The operator definition
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
 * Base constraint operator definitions that work across SQL databases
 * These provide the abstract patterns - each database can implement them specifically
 */
export const baseConstraintOperatorDefinitions = {
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
	// Comparative operators
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
 * Creates constraint operators with preQuery flag set to true
 * @param {Object} operatorDefinitions - The base operator definitions
 * @returns {Object} Constraint operators with preQuery flag
 */
export function createConstraintOperators(
	operatorDefinitions = baseConstraintOperatorDefinitions,
) {
	return mapValues(operatorDefinitions, (definition) => ({
		...definition,
		preQuery: true,
	}));
}

/**
 * SQL expression definitions for common operations
 * These can be used by expression engines in each database store
 */
export const baseSqlExpressions = {
	$and: {
		where: (operand) => operand.join(" AND "),
		vars: (operand) => operand.flat(),
	},
	$eq: {
		where: (operand) => `${operand[0]} = ?`,
		vars: (operand) => operand[1],
	},
	$gt: {
		where: (operand) => `${operand[0]} > ?`,
		vars: (operand) => operand[1],
	},
	$gte: {
		where: (operand) => `${operand[0]} >= ?`,
		vars: (operand) => operand[1],
	},
	$lt: {
		where: (operand) => `${operand[0]} < ?`,
		vars: (operand) => operand[1],
	},
	$lte: {
		where: (operand) => `${operand[0]} <= ?`,
		vars: (operand) => operand[1],
	},
	$ne: {
		where: (operand) => `${operand[0]} != ?`,
		vars: (operand) => operand[1],
	},
	$in: {
		where: (operand) =>
			`${operand[0]} IN (${operand[1].map(() => "?").join(",")})`,
		vars: (operand) => operand[1],
	},
	$nin: {
		where: (operand) =>
			`${operand[0]} NOT IN (${operand[1].map(() => "?").join(",")})`,
		vars: (operand) => operand[1],
	},
	$or: {
		where: (operand, { evaluate }) => {
			const evaluated = operand.map(evaluate);
			return `(${evaluated.join(") OR (")})`;
		},
		vars: (operand, { evaluate }) => {
			// This would need to be implemented by each database
			return operand.flatMap((op) => evaluate(op));
		},
	},
};
