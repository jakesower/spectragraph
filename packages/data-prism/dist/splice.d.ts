import Ajv from "ajv";
import { MemoryStore, NormalResourceTree } from "./memory-store.js";
import { Graph } from "./graph.js";
import { Schema } from "./schema.js";
type Context = {
    schema: Schema;
    validator: Ajv;
    store: MemoryStore;
    storeGraph: Graph;
};
export declare function splice(resourceTree: NormalResourceTree, context: Context): NormalResourceTree;
export {};
//# sourceMappingURL=splice.d.ts.map