import express from "express";
import { Schema, createStore } from "data-prism";
import { parseRequest } from "../src/parse-request.js";
import careBearSchema from "./fixtures/care-bears.schema.json" assert { type: "json" };
import { careBearData } from "./fixtures/care-bear-data.js"; // eslint-disable-line
import { formatResponse } from "../src/format-response.js";

function applySchemaRoutes(schema: Schema, store, app) {
	Object.entries(schema.resources).forEach(([type, resDef]) => {
		app.get(`/${type}`, (req, res) => {
			const query = parseRequest(schema, {
				...req.query,
				type,
				id: req.params.id,
			});
			const result = store.query(query);
			const response = formatResponse(schema, query, result);
			res.json(response);
		});

		app.get(`/${type}/:id`, (req, res) => {
			const query = parseRequest(schema, {
				...req.query,
				type,
				id: req.params.id,
			});
			const result = store.query(query);

			if (result === null) {
				res.status(404).json({ data: null });
				return;
			}

			const response = formatResponse(schema, query, result);
			res.json(response);
		});
	});
}

const app = express();
// app.set("query parser", "simple");

const store = createStore(careBearSchema as Schema, careBearData);

applySchemaRoutes(careBearSchema as Schema, store, app);
app.get("/", (req, res) => {
	res.json("OK");
});

app.listen(3000, "0.0.0.0", () => {
	console.log("running on port 3000");
});
