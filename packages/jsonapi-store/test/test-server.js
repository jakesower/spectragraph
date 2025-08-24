import { createServer } from "@data-prism/jsonapi-server";
import { createMemoryStore } from "@data-prism/memory-store";
import {
	careBearSchema,
	careBearData,
} from "@data-prism/interface-tests/fixtures";

createServer(
	careBearSchema,
	createMemoryStore(careBearSchema, { initialData: careBearData }),
);
