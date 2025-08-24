import { createServer } from "@data-prism/jsonapi-server";
import { createMemoryStore } from "@data-prism/memory-store";
import careBearSchema from "./fixtures/care-bears.schema.json" with { type: "json" };
import { careBearData } from "./fixtures/care-bear-data.js"; // eslint-disable-line

createServer(
	careBearSchema,
	createMemoryStore(careBearSchema, { initialData: careBearData }),
);
