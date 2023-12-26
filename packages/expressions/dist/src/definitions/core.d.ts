export declare const coreDefinitions: {
    readonly $apply: {
        name: string;
        apply: (params: any) => any;
    };
    readonly $defined: {
        name: string;
        apply: (_: any, arg: any) => boolean;
    };
    readonly $echo: {
        name: string;
        apply: (_: any, arg: any) => any;
    };
    readonly $get: {
        name: string;
        apply: (params: any, arg: any) => any;
        controlsEvaluation: boolean;
    };
    readonly $literal: {
        name: string;
        apply: (params: any) => any;
        controlsEvaluation: boolean;
    };
    readonly $pipe: {
        name: string;
        apply: (params: any, arg: any, apply: any) => any;
        controlsEvaluation: boolean;
    };
    readonly $prop: {
        name: string;
        apply: (params: any, arg: any) => any;
        controlsEvaluation: boolean;
    };
};
//# sourceMappingURL=core.d.ts.map