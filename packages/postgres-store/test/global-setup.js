import { Client } from "pg";
import { reset } from "../scripts/seed.js";
import { careBearData } from "./fixtures/care-bear-data.js";
import careBearSchema from "./fixtures/care-bears.schema.json";
import { careBearConfig } from "./care-bear-config.ts";

export default async function setup() {
	const db = new Client({
		user: "postgres",
		host: "localhost",
		database: "dp_test",
		password: "password",
		port: 5432,
	});

	await db.connect();

	await reset(db, careBearSchema, careBearConfig, careBearData);
}
