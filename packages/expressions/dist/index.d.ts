export type ApplicativeExpression = object;
export type Expression = object;
export type Operation<Args, Input, Output> = {
    apply: (expression: any, arg: Input) => Output;
    applyImplicit?: (args: Args, vars: Input, implicitVar: any) => Output;
    evaluate: (params: Input) => Output;
    inject?: (args: any, inject: (v: any) => any) => any;
    name?: string;
    schema: object;
};
export type ExpressionEngine = {
    apply: (expression: Expression, arg: any) => any;
    compile: (expression: Expression) => (arg: any) => any;
    evaluate: (expression: Expression) => any;
    isExpression: (expression: Expression) => boolean;
};
export type FunctionExpression<Args, Input, Output> = (evaluate: (...args: any) => any) => Expression;
export declare function createExpressionEngine(definitions: object): ExpressionEngine;
export declare const defaultExpressionEngine: ExpressionEngine;
//# sourceMappingURL=index.d.ts.map