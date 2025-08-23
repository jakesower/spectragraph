import { runInterfaceTests } from "../../interface-tests/src/index.js";
import { createPostgresStore } from "../src/postgres-store.js";
import { getClient } from "./get-client.js";
import { careBearConfig } from "./fixtures/care-bear-config.js";

runInterfaceTests((schema, options) => {
	const db = getClient();

	return createPostgresStore(schema, {
		...careBearConfig,
		db,
		...options,
	});
});
