import { ErrorObject } from "ajv";
import { Schema } from "./schema.js";
import { Ref } from "./graph.js";
type CreateResource = {
    type: string;
    id?: number | string;
    attributes?: {
        [k: string]: unknown;
    };
    relationships?: {
        [k: string]: Ref | Ref[] | null;
    };
};
type UpdateResource = {
    type: string;
    id: number | string;
    attributes?: {
        [k: string]: unknown;
    };
    relationships?: {
        [k: string]: Ref | Ref[] | null;
    };
};
type DeleteResource = Ref;
type NormalResourceTree = {
    type: string;
    id?: number | string;
    attributes?: {
        [k: string]: unknown;
    };
    relationships?: {
        [k: string]: NormalResourceTree | NormalResourceTree[] | Ref | Ref[] | null;
    };
};
export declare function validateCreateResource(schema: Schema, resource: CreateResource): ErrorObject[];
export declare function validateUpdateResource(schema: Schema, resource: UpdateResource): ErrorObject[];
export declare function validateDeleteResource(schema: Schema, resource: DeleteResource): ErrorObject[];
export declare function validateResourceTree(schema: Schema, resource: NormalResourceTree): ErrorObject[];
export {};
//# sourceMappingURL=validate.d.ts.map