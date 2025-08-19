import { Schema } from "data-prism";
type Ref = {
    type: string;
    id: string;
};
export type CreateRequest = {
    data: {
        type: string;
        id?: string;
        attributes?: {
            [k: string]: unknown;
        };
        relationships?: {
            [k: string]: Ref | Ref[];
        };
    };
};
export declare function create(schema: Schema, store: any): (req: any, res: any) => Promise<void>;
export {};
