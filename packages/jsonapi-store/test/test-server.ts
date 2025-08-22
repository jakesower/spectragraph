import { Schema, createMemoryStore } from "@data-prism/core"
import { createServer } from "@data-prism/jsonapi-server";
import careBearSchema from "./fixtures/care-bears.schema.json" with { type: "json" };
import { careBearData } from "./fixtures/care-bear-data.js"; // eslint-disable-line

createServer(
	careBearSchema as Schema,
	createMemoryStore(careBearSchema as Schema, careBearData),
);
