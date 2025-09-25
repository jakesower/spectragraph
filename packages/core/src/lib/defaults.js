import Ajv from "ajv";
import addFormats from "ajv-formats";
import addErrors from "ajv-errors";
import {
	aggregation,
	createExpressionEngine,
	filtering,
	projection,
} from "json-expressions";

/**
 * @typedef {Object} SelectExpressionEngine
 * @description Expression engine for SELECT clauses - supports filtering, aggregation, and transformation operations
 * @property {string[]} expressionNames - Array of supported expression names (e.g., ['$count', '$sum', '$eq', '$map'])
 * @property {function(any): boolean} isExpression - Check if an object is a valid expression
 * @property {function(any, any): any} apply - Evaluate an expression against input data
 */

/**
 * @typedef {Object} WhereExpressionEngine
 * @description Expression engine for WHERE clauses - supports filtering and logic operations only
 * @property {string[]} expressionNames - Array of supported expression names (e.g., ['$eq', '$and', '$filter'])
 * @property {function(any): boolean} isExpression - Check if an object is a valid expression
 * @property {function(any, any): any} apply - Evaluate an expression against input data
 */

/**
 * Default expression engine for SELECT clauses
 * @type {SelectExpressionEngine}
 */
export const defaultSelectEngine = createExpressionEngine({
	packs: [filtering, projection, aggregation],
});

/**
 * Default expression engine for WHERE clauses
 * @type {WhereExpressionEngine}
 */
export const defaultWhereEngine = createExpressionEngine({
	packs: [filtering],
});

export const defaultValidator = new Ajv({
	allErrors: true,
	allowUnionTypes: true,
});
addFormats(defaultValidator);
addErrors(defaultValidator);
