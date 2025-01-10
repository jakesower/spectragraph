import { Ref } from "./graph";
export type DeleteResource = {
    type: string;
    id: string;
    attributes?: {
        [k: string]: unknown;
    };
    relationships?: {
        [k: string]: Ref | Ref[];
    };
};
export declare function deleteAction(resource: DeleteResource, context: any): DeleteResource;
//# sourceMappingURL=delete.d.ts.map