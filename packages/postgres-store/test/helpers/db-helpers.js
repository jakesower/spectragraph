import { Client } from "pg";

export async function getDatabase() {
	const client = new Client({
		user: process.env.POSTGRES_USER,
		host: "localhost",
		database: process.env.POSTGRES_DB,
		password: process.env.POSTGRES_PASSWORD,
		port: Number(process.env.POSTGRES_PORT),
	});

	await client.connect();
	await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
	await client.query('CREATE EXTENSION IF NOT EXISTS "postgis"');

	return client;
}