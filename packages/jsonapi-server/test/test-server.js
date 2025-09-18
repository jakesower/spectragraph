import { createMemoryStore } from "@spectragraph/memory-store";
import { createServer } from "../src/server.js";
import careBearSchema from "./fixtures/care-bears.schema.json" with { type: "json" };
import { careBearData } from "./fixtures/care-bear-data.js";

createServer(
	careBearSchema,
	createMemoryStore(careBearSchema, { initialData: careBearData }),
);
