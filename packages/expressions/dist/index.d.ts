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
export declare const defaultExpressions: {
    $filter: {
        apply: (subexpr: any, arg: any, apply: any) => any;
        controlsEvaluation: boolean;
    };
    $flatMap: {
        apply: (subexpr: any, arg: any, apply: any) => any;
        controlsEvaluation: boolean;
    };
    $map: {
        apply: (subexpr: any, arg: any, apply: any) => any;
        controlsEvaluation: boolean;
    };
    $count: {
        name: string;
        apply(params: any): any;
        evaluate: (params: any) => any;
        schema: {
            type: string;
            minimum: number;
        };
    };
    $max: {
        name: string;
        apply(params: any): any;
        evaluate: (val: any) => any;
        schema: {
            type: string;
        };
    };
    $min: {
        name: string;
        apply(params: any): any;
        evaluate: (val: any) => any;
        schema: {
            type: string;
        };
    };
    $sum: {
        name: string;
        apply(params: any): any;
        evaluate: (params: any) => any;
        schema: {
            type: string;
        };
    };
    $eq: {
        apply: (expression: any, arg: any) => boolean;
        applyImplicit?: (args: any, vars: any, implicitVar: any) => boolean;
        evaluate: (params: any) => boolean;
        inject?: (args: any, inject: (v: any) => any) => any;
        name?: string;
        schema: object;
    };
    $gt: {
        name: string;
        apply: (param: any, arg: any) => boolean;
        evaluate: ([left, right]: [any, any]) => boolean;
        inject: (param: any, implicit: any) => any[];
        schema: {
            type: string;
        };
    };
    $gte: {
        name: string;
        apply: (param: any, arg: any) => boolean;
        evaluate: ([left, right]: [any, any]) => boolean;
        inject: (param: any, implicit: any) => any[];
        schema: {
            type: string;
        };
    };
    $lt: {
        name: string;
        apply: (param: any, arg: any) => boolean;
        evaluate: ([left, right]: [any, any]) => boolean;
        inject: (param: any, implicit: any) => any[];
        schema: {
            type: string;
        };
    };
    $lte: {
        name: string;
        apply: (param: any, arg: any) => boolean;
        evaluate: ([left, right]: [any, any]) => boolean;
        inject: (param: any, implicit: any) => any[];
        schema: {
            type: string;
        };
    };
    $ne: {
        apply: (expression: any, arg: any) => boolean;
        applyImplicit?: (args: any, vars: any, implicitVar: any) => boolean;
        evaluate: (params: any) => boolean;
        inject?: (args: any, inject: (v: any) => any) => any;
        name?: string;
        schema: object;
    };
    $in: {
        name: string;
        apply: (param: any, arg: any) => any;
        evaluate: (param: any, arg: any) => any;
        inject: (param: any, implicit: any) => any[];
        schema: {
            type: string;
        };
    };
    $nin: {
        name: string;
        apply: (param: any, arg: any) => boolean;
        evaluate: (param: any, arg: any) => boolean;
        inject: (param: any, implicit: any) => any[];
        schema: {
            type: string;
        };
    };
    $and: {
        name: string;
        apply: (params: any, arg: any, apply: any) => any;
        controlsEvaluation: boolean;
        evaluate: (params: any) => any;
        schema: {
            type: string;
        };
    };
    $not: {
        name: string;
        apply: (subexpr: any, arg: any, apply: any) => boolean;
        controlsEvaluation: boolean;
        schema: {
            type: string;
        };
    };
    $or: {
        name: string;
        apply: (params: any, arg: any, apply: any) => any;
        controlsEvaluation: boolean;
        evaluate: (params: any) => any;
        schema: {
            type: string;
        };
    };
    $apply: {
        name: string;
        apply: (params: any) => any;
    };
    $defined: {
        name: string;
        apply: (_: any, arg: any) => boolean;
    };
    $echo: {
        name: string;
        apply: (_: any, arg: any) => any;
    };
    $ensurePath: {
        name: string;
        apply: (params: any, arg: any) => any;
    };
    $get: {
        name: string;
        apply: (params: any, arg: any) => any;
    };
    $ifThenElse: {
        name: string;
        apply: (params: any, arg: any, apply: any, isExpression: any) => any;
        controlsEvaluation: boolean;
    };
    $literal: {
        name: string;
        apply: (params: any) => any;
        controlsEvaluation: boolean;
    };
    $log: {
        name: string;
        apply: (_: any, arg: any) => any;
    };
    $pipe: {
        name: string;
        apply: (params: any, arg: any, apply: any, isExpression: any) => any;
        controlsEvaluation: boolean;
    };
    $prop: {
        name: string;
        apply: (params: any, arg: any) => any;
        controlsEvaluation: boolean;
    };
};
export declare const defaultExpressionEngine: ExpressionEngine;
//# sourceMappingURL=index.d.ts.map