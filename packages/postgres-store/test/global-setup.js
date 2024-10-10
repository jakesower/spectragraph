import { reset } from "../scripts/seed.js";
import { careBearData } from "./fixtures/care-bear-data.js";
import careBearSchema from "./fixtures/care-bears.schema.json";
import { careBearConfig } from "./fixtures/care-bear-config.ts";
import { Client } from "pg";

export const db = new Client({
	user: "postgres",
	host: "localhost",
	database: "dp_test",
	password: "admin",
	port: 5432,
});

export default async function setup() {
	await db.connect();
	await db.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
	await db.query('CREATE EXTENSION IF NOT EXISTS "postgis"');
	await reset(db, careBearSchema, careBearConfig, careBearData);
}
