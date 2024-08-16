import { reset } from "../scripts/seed.js";
import { careBearData } from "./fixtures/care-bear-data.js";
import careBearSchema from "./fixtures/care-bears.schema.json";
import { careBearConfig } from "./care-bear-config.ts";
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
	await reset(db, careBearSchema, careBearConfig, careBearData);
}
