import { Schema, createMemoryStore } from "@data-prism/core"
import careBearSchema from "./fixtures/care-bears.schema.json" with { type: "json" };
import { careBearData } from "./fixtures/care-bear-data.js"; // eslint-disable-line
import { createServer } from "../src/server.js";

createServer(
	careBearSchema as Schema,
	createMemoryStore(careBearSchema as Schema, careBearData),
);
