export declare const constraintOperators: {
    $and: {
        preQuery: boolean;
        compile: (exprVal: any, compile: any) => () => {
            where: string[];
            vars: any[];
        };
    } | {
        preQuery: boolean;
        compile: (exprVal: any, compile: any) => () => {
            where?: undefined;
            vars?: undefined;
        } | {
            where: string[];
            vars: any;
        };
    } | {
        preQuery: boolean;
        compile: (exprVal: any, _: any, { query, schema }: {
            query: any;
            schema: any;
        }) => () => {
            where: any;
            vars: any[];
        };
    } | {
        preQuery: boolean;
        compile: (args: any, compile: any) => (vars: any) => {
            where?: undefined;
            vars?: undefined;
        } | {
            where: string;
            vars: any;
        };
    } | {
        preQuery: boolean;
        compile: (args: any, compile: any) => (vars: any) => {
            where?: undefined;
            vars?: undefined;
        } | {
            where: string;
            vars: any;
        };
    };
    $prop: {
        preQuery: boolean;
        compile: (exprVal: any, compile: any) => () => {
            where: string[];
            vars: any[];
        };
    } | {
        preQuery: boolean;
        compile: (exprVal: any, compile: any) => () => {
            where?: undefined;
            vars?: undefined;
        } | {
            where: string[];
            vars: any;
        };
    } | {
        preQuery: boolean;
        compile: (exprVal: any, _: any, { query, schema }: {
            query: any;
            schema: any;
        }) => () => {
            where: any;
            vars: any[];
        };
    } | {
        preQuery: boolean;
        compile: (args: any, compile: any) => (vars: any) => {
            where?: undefined;
            vars?: undefined;
        } | {
            where: string;
            vars: any;
        };
    } | {
        preQuery: boolean;
        compile: (args: any, compile: any) => (vars: any) => {
            where?: undefined;
            vars?: undefined;
        } | {
            where: string;
            vars: any;
        };
    };
    $eq: {
        preQuery: boolean;
        compile: (exprVal: any, compile: any) => () => {
            where: string[];
            vars: any[];
        };
    } | {
        preQuery: boolean;
        compile: (exprVal: any, compile: any) => () => {
            where?: undefined;
            vars?: undefined;
        } | {
            where: string[];
            vars: any;
        };
    } | {
        preQuery: boolean;
        compile: (exprVal: any, _: any, { query, schema }: {
            query: any;
            schema: any;
        }) => () => {
            where: any;
            vars: any[];
        };
    } | {
        preQuery: boolean;
        compile: (args: any, compile: any) => (vars: any) => {
            where?: undefined;
            vars?: undefined;
        } | {
            where: string;
            vars: any;
        };
    } | {
        preQuery: boolean;
        compile: (args: any, compile: any) => (vars: any) => {
            where?: undefined;
            vars?: undefined;
        } | {
            where: string;
            vars: any;
        };
    };
    $gt: {
        preQuery: boolean;
        compile: (exprVal: any, compile: any) => () => {
            where: string[];
            vars: any[];
        };
    } | {
        preQuery: boolean;
        compile: (exprVal: any, compile: any) => () => {
            where?: undefined;
            vars?: undefined;
        } | {
            where: string[];
            vars: any;
        };
    } | {
        preQuery: boolean;
        compile: (exprVal: any, _: any, { query, schema }: {
            query: any;
            schema: any;
        }) => () => {
            where: any;
            vars: any[];
        };
    } | {
        preQuery: boolean;
        compile: (args: any, compile: any) => (vars: any) => {
            where?: undefined;
            vars?: undefined;
        } | {
            where: string;
            vars: any;
        };
    } | {
        preQuery: boolean;
        compile: (args: any, compile: any) => (vars: any) => {
            where?: undefined;
            vars?: undefined;
        } | {
            where: string;
            vars: any;
        };
    };
    $gte: {
        preQuery: boolean;
        compile: (exprVal: any, compile: any) => () => {
            where: string[];
            vars: any[];
        };
    } | {
        preQuery: boolean;
        compile: (exprVal: any, compile: any) => () => {
            where?: undefined;
            vars?: undefined;
        } | {
            where: string[];
            vars: any;
        };
    } | {
        preQuery: boolean;
        compile: (exprVal: any, _: any, { query, schema }: {
            query: any;
            schema: any;
        }) => () => {
            where: any;
            vars: any[];
        };
    } | {
        preQuery: boolean;
        compile: (args: any, compile: any) => (vars: any) => {
            where?: undefined;
            vars?: undefined;
        } | {
            where: string;
            vars: any;
        };
    } | {
        preQuery: boolean;
        compile: (args: any, compile: any) => (vars: any) => {
            where?: undefined;
            vars?: undefined;
        } | {
            where: string;
            vars: any;
        };
    };
    $lt: {
        preQuery: boolean;
        compile: (exprVal: any, compile: any) => () => {
            where: string[];
            vars: any[];
        };
    } | {
        preQuery: boolean;
        compile: (exprVal: any, compile: any) => () => {
            where?: undefined;
            vars?: undefined;
        } | {
            where: string[];
            vars: any;
        };
    } | {
        preQuery: boolean;
        compile: (exprVal: any, _: any, { query, schema }: {
            query: any;
            schema: any;
        }) => () => {
            where: any;
            vars: any[];
        };
    } | {
        preQuery: boolean;
        compile: (args: any, compile: any) => (vars: any) => {
            where?: undefined;
            vars?: undefined;
        } | {
            where: string;
            vars: any;
        };
    } | {
        preQuery: boolean;
        compile: (args: any, compile: any) => (vars: any) => {
            where?: undefined;
            vars?: undefined;
        } | {
            where: string;
            vars: any;
        };
    };
    $lte: {
        preQuery: boolean;
        compile: (exprVal: any, compile: any) => () => {
            where: string[];
            vars: any[];
        };
    } | {
        preQuery: boolean;
        compile: (exprVal: any, compile: any) => () => {
            where?: undefined;
            vars?: undefined;
        } | {
            where: string[];
            vars: any;
        };
    } | {
        preQuery: boolean;
        compile: (exprVal: any, _: any, { query, schema }: {
            query: any;
            schema: any;
        }) => () => {
            where: any;
            vars: any[];
        };
    } | {
        preQuery: boolean;
        compile: (args: any, compile: any) => (vars: any) => {
            where?: undefined;
            vars?: undefined;
        } | {
            where: string;
            vars: any;
        };
    } | {
        preQuery: boolean;
        compile: (args: any, compile: any) => (vars: any) => {
            where?: undefined;
            vars?: undefined;
        } | {
            where: string;
            vars: any;
        };
    };
    $ne: {
        preQuery: boolean;
        compile: (exprVal: any, compile: any) => () => {
            where: string[];
            vars: any[];
        };
    } | {
        preQuery: boolean;
        compile: (exprVal: any, compile: any) => () => {
            where?: undefined;
            vars?: undefined;
        } | {
            where: string[];
            vars: any;
        };
    } | {
        preQuery: boolean;
        compile: (exprVal: any, _: any, { query, schema }: {
            query: any;
            schema: any;
        }) => () => {
            where: any;
            vars: any[];
        };
    } | {
        preQuery: boolean;
        compile: (args: any, compile: any) => (vars: any) => {
            where?: undefined;
            vars?: undefined;
        } | {
            where: string;
            vars: any;
        };
    } | {
        preQuery: boolean;
        compile: (args: any, compile: any) => (vars: any) => {
            where?: undefined;
            vars?: undefined;
        } | {
            where: string;
            vars: any;
        };
    };
    $in: {
        preQuery: boolean;
        compile: (exprVal: any, compile: any) => () => {
            where: string[];
            vars: any[];
        };
    } | {
        preQuery: boolean;
        compile: (exprVal: any, compile: any) => () => {
            where?: undefined;
            vars?: undefined;
        } | {
            where: string[];
            vars: any;
        };
    } | {
        preQuery: boolean;
        compile: (exprVal: any, _: any, { query, schema }: {
            query: any;
            schema: any;
        }) => () => {
            where: any;
            vars: any[];
        };
    } | {
        preQuery: boolean;
        compile: (args: any, compile: any) => (vars: any) => {
            where?: undefined;
            vars?: undefined;
        } | {
            where: string;
            vars: any;
        };
    } | {
        preQuery: boolean;
        compile: (args: any, compile: any) => (vars: any) => {
            where?: undefined;
            vars?: undefined;
        } | {
            where: string;
            vars: any;
        };
    };
    $nin: {
        preQuery: boolean;
        compile: (exprVal: any, compile: any) => () => {
            where: string[];
            vars: any[];
        };
    } | {
        preQuery: boolean;
        compile: (exprVal: any, compile: any) => () => {
            where?: undefined;
            vars?: undefined;
        } | {
            where: string[];
            vars: any;
        };
    } | {
        preQuery: boolean;
        compile: (exprVal: any, _: any, { query, schema }: {
            query: any;
            schema: any;
        }) => () => {
            where: any;
            vars: any[];
        };
    } | {
        preQuery: boolean;
        compile: (args: any, compile: any) => (vars: any) => {
            where?: undefined;
            vars?: undefined;
        } | {
            where: string;
            vars: any;
        };
    } | {
        preQuery: boolean;
        compile: (args: any, compile: any) => (vars: any) => {
            where?: undefined;
            vars?: undefined;
        } | {
            where: string;
            vars: any;
        };
    };
};
//# sourceMappingURL=constraint-operators.d.ts.map