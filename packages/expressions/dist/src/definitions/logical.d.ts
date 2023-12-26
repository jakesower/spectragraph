export declare const logicalDefinitions: {
    readonly $and: {
        name: string;
        apply: (params: any, arg: any, apply: any) => any;
        controlsEvaluation: boolean;
        evaluate: (params: any) => any;
        schema: {
            type: string;
        };
    };
    readonly $not: {
        name: string;
        apply: (subexpr: any, arg: any, apply: any) => boolean;
        controlsEvaluation: boolean;
        schema: {
            type: string;
        };
    };
    readonly $or: {
        name: string;
        apply: (params: any, arg: any, apply: any) => any;
        controlsEvaluation: boolean;
        evaluate: (params: any) => any;
        schema: {
            type: string;
        };
    };
};
//# sourceMappingURL=logical.d.ts.map