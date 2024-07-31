import express from "express";
import { Schema } from "data-prism";
import { formatResponse } from "./format-response.js";
import { parseRequest } from "./parse-request.js";

export function applySchemaRoutes(schema: Schema, store, app) {
	const handleRequest = (type) => (req, res) => {
		const query = parseRequest(schema, {
			...req.query,
			type,
			id: req.params.id,
		});
		const result = store.query(query);
		const response = formatResponse(schema, query, result);
		res.json(response);
	};

	Object.keys(schema.resources).forEach((type) => {
		app.get(`/${type}`, handleRequest(type));
		app.get(`/${type}/:id`, handleRequest(type));
	});
}

type Options = {
	port?: number;
};

export function createServer(schema, store, options: Options = {}) {
	const app = express();
	const { port = 3000 } = options;

	applySchemaRoutes(schema, store, app);

	app.get("/", (req, res) => {
		res.send("OK");
	});

	app.listen(port, "0.0.0.0", () => {
		console.log(`running on port ${port}`);
	});
}
