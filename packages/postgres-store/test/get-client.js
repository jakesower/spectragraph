import { Client } from "pg";

export const db = new Client({
	user: "postgres",
	host: "localhost",
	database: "dp_test",
	password: "admin",
	port: 5432,
});
