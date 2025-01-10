import { Expression } from "@data-prism/expressions";
export type Projection = {
    [k: string]: any;
};
/**
 * Takes a query and returns the fields that will need to be fetched to ensure
 * all expressions within the query are usable.
 *
 * @param projection - Projection
 * @returns object
 */
export declare function projectionQueryProperties(projection: Projection): {};
export declare function createExpressionProjector(expression: Expression, expressionEngine: any): (result: any) => any;
//# sourceMappingURL=select-helpers.d.ts.map