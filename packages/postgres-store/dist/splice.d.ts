import Ajv from "ajv";
import { Context, PostgresStore } from "./postgres-store.js";
import { NormalResourceTree } from "data-prism";
type ExtendedContext = Context & {
    store: PostgresStore;
    validator: Ajv;
};
export declare function splice(resource: NormalResourceTree, context: ExtendedContext): Promise<NormalResourceTree>;
export {};
//# sourceMappingURL=splice.d.ts.map