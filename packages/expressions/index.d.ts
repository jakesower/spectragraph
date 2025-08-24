// TypeScript definitions for @data-prism/expressions
// Generated from JSDoc annotations

/**
 * Expression operation names - must start with $
 */
export type ExpressionName = `$${string}`;

/**
 * Base type for single-key expressions
 */
type SingleKeyExpression<K extends ExpressionName, V = unknown> = {
  [Key in K]: V;
};

/**
 * @typedef {object} ApplicativeExpression
 */
export type ApplicativeExpression = SingleKeyExpression<ExpressionName, unknown>;

/**
 * @typedef {object} Expression
 */
export type Expression = SingleKeyExpression<ExpressionName, unknown>;

/**
 * Expression context passed to operations that control evaluation
 */
export interface ExpressionContext {
	apply: (expression: Expression, inputData: any) => any;
	evaluate: (expression: Expression) => any;
	isExpression: (value: any) => boolean;
}

/**
 * Specific expression types for better type checking
 */
// Core expressions
export type GetExpression = SingleKeyExpression<"$get", string>;
export type ApplyExpression = SingleKeyExpression<"$apply", unknown>;
export type EchoExpression = SingleKeyExpression<"$echo", [unknown]>;
export type DebugExpression = SingleKeyExpression<"$debug", Expression>;
export type LiteralExpression = SingleKeyExpression<"$literal", unknown>;
export type ComposeExpression = SingleKeyExpression<"$compose", Expression[]>;
export type PipeExpression = SingleKeyExpression<"$pipe", Expression[]>;
export type EnsurePathExpression = SingleKeyExpression<"$ensurePath", [object, string]>;
export type IsDefinedExpression = SingleKeyExpression<"$isDefined", [unknown]>;

// Comparative expressions
export type EqualExpression = SingleKeyExpression<"$eq", unknown>;
export type NotEqualExpression = SingleKeyExpression<"$ne", unknown>;
export type GreaterThanExpression = SingleKeyExpression<"$gt", number>;
export type GreaterThanEqualExpression = SingleKeyExpression<"$gte", number>;
export type LessThanExpression = SingleKeyExpression<"$lt", number>;
export type LessThanEqualExpression = SingleKeyExpression<"$lte", number>;
export type InExpression = SingleKeyExpression<"$in", unknown[]>;
export type NotInExpression = SingleKeyExpression<"$nin", unknown[]>;

// Logical expressions
export type AndExpression = SingleKeyExpression<"$and", Expression[]>;
export type OrExpression = SingleKeyExpression<"$or", Expression[]>;
export type NotExpression = SingleKeyExpression<"$not", Expression | boolean>;

// Aggregative expressions
export type CountExpression = SingleKeyExpression<"$count", unknown[]>;
export type SumExpression = SingleKeyExpression<"$sum", number[]>;
export type MaxExpression = SingleKeyExpression<"$max", number[]>;
export type MinExpression = SingleKeyExpression<"$min", number[]>;
export type MeanExpression = SingleKeyExpression<"$mean", number[]>;
export type MedianExpression = SingleKeyExpression<"$median", number[]>;
export type ModeExpression = SingleKeyExpression<"$mode", unknown[]>;

// Iterative expressions
export type FilterExpression = SingleKeyExpression<"$filter", Expression>;
export type MapExpression = SingleKeyExpression<"$map", Expression>;
export type FlatMapExpression = SingleKeyExpression<"$flatMap", Expression>;
export type AnyExpression = SingleKeyExpression<"$any", Expression>;
export type AllExpression = SingleKeyExpression<"$all", Expression>;
export type FindExpression = SingleKeyExpression<"$find", Expression>;
export type ConcatExpression = SingleKeyExpression<"$concat", unknown[]>;
export type JoinExpression = SingleKeyExpression<"$join", string>;
export type ReverseExpression = SingleKeyExpression<"$reverse", unknown>;

// Generative expressions
export type RandomExpression = SingleKeyExpression<"$random", { min?: number; max?: number; precision?: number }>;
export type UuidExpression = SingleKeyExpression<"$uuid", unknown>;

// Temporal expressions
export type NowLocalExpression = SingleKeyExpression<"$nowLocal", unknown>;
export type NowUtcExpression = SingleKeyExpression<"$nowUTC", unknown>;
export type TimestampExpression = SingleKeyExpression<"$timestamp", unknown>;
export type IfExpression = SingleKeyExpression<"$if", {
  if: Expression | boolean;
  then: unknown;
  else: unknown;
}>;
export type CaseExpression = SingleKeyExpression<"$case", {
  value: Expression | unknown;
  cases: Array<{ when: unknown | Expression; then: unknown }>;
  default: unknown;
}>;

/**
 * Union of all known expression types
 */
export type KnownExpression = 
  // Core
  | GetExpression | ApplyExpression | EchoExpression | DebugExpression | LiteralExpression
  | ComposeExpression | PipeExpression | EnsurePathExpression | IsDefinedExpression
  // Comparative
  | EqualExpression | NotEqualExpression | GreaterThanExpression | GreaterThanEqualExpression
  | LessThanExpression | LessThanEqualExpression | InExpression | NotInExpression
  // Logical
  | AndExpression | OrExpression | NotExpression
  // Aggregative
  | CountExpression | SumExpression | MaxExpression | MinExpression
  | MeanExpression | MedianExpression | ModeExpression
  // Iterative
  | FilterExpression | MapExpression | FlatMapExpression | AnyExpression
  | AllExpression | FindExpression | ConcatExpression | JoinExpression | ReverseExpression
  // Generative
  | RandomExpression | UuidExpression
  // Temporal
  | NowLocalExpression | NowUtcExpression | TimestampExpression
  // Control flow
  | IfExpression | CaseExpression;

/**
 * @template Args, Input, Output
 * @typedef {object} Operation
 * @property {function(any, Input): Output} apply
 * @property {function(Args, Input, any): Output} [applyImplicit]
 * @property {function(Input): Output} evaluate
 * @property {string} [name]
 * @property {object} schema
 */
export interface Operation<Args = any, Input = any, Output = any> {
	apply: (operand: any, inputData: Input, context?: ExpressionContext) => Output;
	applyImplicit?: (args: Args, vars: Input, implicitVar: any) => Output;
	evaluate: (operand: Input, context?: ExpressionContext) => Output;
	name?: string;
	schema?: object;
	controlsEvaluation?: boolean;
}

/**
 * @typedef {object} ExpressionEngine
 * @property {function(Expression, any): any} apply
 * @property {function(Expression): any} evaluate
 * @property {string[]} expressionNames
 * @property {function(Expression): boolean} isExpression
 */
export interface ExpressionEngine {
	apply: (expression: Expression, inputData: any) => any;
	evaluate: (expression: Expression) => any;
	expressionNames: string[];
	isExpression: (value: any) => value is Expression;
}

/**
 * Function that creates an expression
 */
export type ExpressionFactory<T = any> = (...args: any[]) => SingleKeyExpression<ExpressionName, T>;

/**
 * @param {object} definitions
 * @returns {ExpressionEngine}
 */
export function createExpressionEngine(customOperations?: Record<string, Operation>): ExpressionEngine;

export const defaultExpressions: Record<string, Operation>;
export const defaultExpressionEngine: ExpressionEngine;