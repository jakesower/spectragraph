type ColumnTypeModifier = {
    castForValidation?: (val: any) => any;
    schemaProperties?: {
        type: string;
        format?: string;
        $ref?: string;
    };
    subTypes?: {
        [k: string]: {
            castForValidation?: (val: any) => any;
            schemaProperties?: {
                type: string;
                format?: string;
                $ref?: string;
            };
        };
    };
};
export declare const columnTypeModifiers: {
    [k: string]: ColumnTypeModifier;
};
export {};
//# sourceMappingURL=column-type-modifiers.d.ts.map