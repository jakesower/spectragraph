import { CreateRequest } from "./create.js";
import { Schema } from "data-prism";
type Body = CreateRequest;
export declare function validateRequest(schema: Schema, body: Body): {
    status: string;
    title: string;
    description: string;
    meta: import("ajv").ErrorObject<string, Record<string, any>, unknown>;
}[] | {
    status: string;
    title: string;
    description: string;
}[];
export {};
