import { Operation } from "../expressions";
type FilterOperation<T> = Operation<T, T, boolean>;
export declare const comparativeDefinitions: {
    readonly $eq: FilterOperation<any>;
    readonly $gt: {
        name: string;
        apply: (param: any, arg: any) => boolean;
        evaluate: ([left, right]: [any, any]) => boolean;
        inject: (param: any, implicit: any) => any[];
        schema: {
            type: string;
        };
    };
    readonly $gte: {
        name: string;
        apply: (param: any, arg: any) => boolean;
        evaluate: ([left, right]: [any, any]) => boolean;
        inject: (param: any, implicit: any) => any[];
        schema: {
            type: string;
        };
    };
    readonly $lt: {
        name: string;
        apply: (param: any, arg: any) => boolean;
        evaluate: ([left, right]: [any, any]) => boolean;
        inject: (param: any, implicit: any) => any[];
        schema: {
            type: string;
        };
    };
    readonly $lte: {
        name: string;
        apply: (param: any, arg: any) => boolean;
        evaluate: ([left, right]: [any, any]) => boolean;
        inject: (param: any, implicit: any) => any[];
        schema: {
            type: string;
        };
    };
    readonly $ne: FilterOperation<any>;
    readonly $in: {
        name: string;
        apply: (param: any, arg: any) => any;
        evaluate: (param: any, arg: any) => any;
        inject: (param: any, implicit: any) => any[];
        schema: {
            type: string;
        };
    };
    readonly $nin: {
        name: string;
        apply: (param: any, arg: any) => boolean;
        evaluate: (param: any, arg: any) => boolean;
        inject: (param: any, implicit: any) => any[];
        schema: {
            type: string;
        };
    };
};
export {};
//# sourceMappingURL=comparative.d.ts.map