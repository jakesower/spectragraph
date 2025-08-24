import careBearSchema from "./fixtures/care-bears.schema.json" with { type: "json" };
import { careBearData } from "./fixtures/care-bear-data.js";  
import { createServer } from "../src/server.js";
import { createMemoryStore } from "@data-prism/memory-store";

createServer(
	careBearSchema,
	createMemoryStore(careBearSchema, { initialData: careBearData }),
);
