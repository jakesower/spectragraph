import express from "express";
import { Schema } from "data-prism";
import { create } from "./create.js";
import { update } from "./update.js";
import { deleteHandler } from "./delete.js";
import { get } from "./get.js";

type Options = {
	port?: number;
};

type Server = {
	getAllHandler: (type: string) => (req: any, res: any) => Promise<void>;
	getOneHandler: (type: string) => (req: any, res: any) => Promise<void>;
	createHandler: (type: string) => (req: any, res: any) => Promise<void>;
	updateHandler: (type: string) => (req: any, res: any) => Promise<void>;
	deleteHandler: (type: string) => (req: any, res: any) => Promise<void>;
};

export function createJSONAPIHandlers(schema: Schema, store): Server {
	return {
		getAllHandler: (type) => get(schema, store, type),
		getOneHandler: (type) => get(schema, store, type),
		createHandler: () => create(store),
		updateHandler: () => update(store),
		deleteHandler: (type) => deleteHandler(type, store),
	};
}

export function applySchemaRoutes(schema: Schema, store, app) {
	const server = createJSONAPIHandlers(schema, store);

	Object.keys(schema.resources).forEach((type) => {
		app.get(`/${type}`, server.getAllHandler(type));
		app.get(`/${type}/:id`, server.getOneHandler(type));
		app.post(`/${type}`, server.createHandler(type));
		app.patch(`/${type}/:id`, server.updateHandler(type));
		app.delete(`/${type}/:id`, server.deleteHandler(type));
	});
}

export function createServer(schema, store, options: Options = {}) {
	const app = express();
	app.use(express.json());
	const { port = 3000 } = options;

	applySchemaRoutes(schema, store, app);

	app.get("/", (req, res) => {
		res.send("OK");
	});

	app.listen(port, "0.0.0.0", () => {
		console.log(`running on port ${port}`);
	});
}
