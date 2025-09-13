import { createServer } from "@spectragraph/jsonapi-server";
import { createMemoryStore } from "@spectragraph/memory-store";
import {
	careBearSchema,
	careBearData,
} from "@spectragraph/interface-tests/fixtures";

createServer(
	careBearSchema,
	createMemoryStore(careBearSchema, { initialData: careBearData }),
);
