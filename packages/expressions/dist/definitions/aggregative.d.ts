export declare const aggregativeDefinitions: {
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
};
//# sourceMappingURL=aggregative.d.ts.map