import Ajv, { ErrorObject } from "ajv";
import { Schema } from "./schema.js";
import { Ref } from "./graph.js";
import { NormalResourceTree } from "./memory-store.js";
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
export declare const defaultValidator: Ajv;
export declare const createValidator: () => Ajv;
export declare function validateCreateResource(schema: Schema, resource: CreateResource, validator?: Ajv): ErrorObject[];
export declare function validateUpdateResource(schema: Schema, resource: UpdateResource, validator?: Ajv): ErrorObject[];
export declare function validateDeleteResource(schema: Schema, resource: DeleteResource, validator?: Ajv): ErrorObject[];
export declare function validateResourceTree(schema: Schema, resource: NormalResourceTree, validator?: Ajv): ErrorObject[];
export {};
//# sourceMappingURL=validate.d.ts.map