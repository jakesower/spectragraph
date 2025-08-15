// TypeScript definitions for @data-prism/expressions
// Generated from JSDoc annotations

/**
 * @typedef {object} ApplicativeExpression
 */
export type ApplicativeExpression = object;

/**
 * @typedef {object} Expression
 */
export type Expression = object;

/**
 * @template Args, Input, Output
 * @typedef {object} Operation
 * @property {function(any, Input): Output} apply
 * @property {function(Args, Input, any): Output} [applyImplicit]
 * @property {function(Input): Output} evaluate
 * @property {function(any, function(any): any): any} [inject]
 * @property {string} [name]
 * @property {object} schema
 */
export interface Operation<Args, Input, Output> {
	apply: (expression: any, arg: Input) => Output;
	applyImplicit?: (args: Args, vars: Input, implicitVar: any) => Output;
	evaluate: (params: Input) => Output;
	inject?: (args: any, inject: (v: any) => any) => any;
	name?: string;
	schema: object;
}

/**
 * @typedef {object} ExpressionEngine
 * @property {function(Expression, any): any} apply
 * @property {function(Expression): function(any): any} compile
 * @property {function(Expression): any} evaluate
 * @property {string[]} expressionNames
 * @property {function(Expression): boolean} isExpression
 */
export interface ExpressionEngine {
	apply: (expression: Expression, arg: any) => any;
	compile: (expression: Expression) => (arg: any) => any;
	evaluate: (expression: Expression) => any;
	expressionNames: string[];
	isExpression: (expression: Expression) => boolean;
}

/**
 * @template Args, Input, Output
 * @typedef {function(...any): Expression} FunctionExpression
 */
export type FunctionExpression<Args, Input, Output> = (
	evaluate: (...args: any) => any,
) => Expression;

/**
 * @param {object} definitions
 * @returns {ExpressionEngine}
 */
export function createExpressionEngine(definitions: object): ExpressionEngine;

export const defaultExpressions: object;
export const defaultExpressionEngine: ExpressionEngine;