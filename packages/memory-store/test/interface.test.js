import { runInterfaceTests } from "../../interface-tests/src/index.js";
import { createMemoryStore } from "../src/index.js";

runInterfaceTests((schema, options) => createMemoryStore(schema, options));