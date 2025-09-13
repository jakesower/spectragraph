import express from "express";
import { create } from "./create.js";
import { update } from "./update.js";
import { deleteHandler } from "./delete.js";
import { get } from "./get.js";

/**
 * @typedef {Object} Options
 * @property {number} [port] - Port number for the server
 */

/**
 * @typedef {Object} Server
 * @property {(type: string) => (req: any, res: any) => Promise<void>} getAllHandler - Handler for GET /resource requests
 * @property {(type: string) => (req: any, res: any) => Promise<void>} getOneHandler - Handler for GET /resource/:id requests
 * @property {(type: string) => (req: any, res: any) => Promise<void>} createHandler - Handler for POST /resource requests
 * @property {(type: string) => (req: any, res: any) => Promise<void>} updateHandler - Handler for PATCH /resource/:id requests
 * @property {(type: string) => (req: any, res: any) => Promise<void>} deleteHandler - Handler for DELETE /resource/:id requests
 */

/**
 * Creates JSON:API request handlers for a schema and store
 * @param {import("@spectragraph/core").Schema} schema - The schema defining resources
 * @param {*} store - The data store instance
 * @returns {Server} Object with handler functions for each HTTP method
 */
export function createJSONAPIHandlers(schema, store) {
	return {
		getAllHandler: (type) => get(schema, store, type),
		getOneHandler: (type) => get(schema, store, type),
		createHandler: () => create(schema, store),
		updateHandler: () => update(store),
		deleteHandler: (type) => deleteHandler(type, store),
	};
}

/**
 * Applies JSON:API routes to an Express app based on schema resources
 * @param {import("@spectragraph/core").Schema} schema - The schema defining resources
 * @param {*} store - The data store instance
 * @param {*} app - Express app instance
 */
export function applySchemaRoutes(schema, store, app) {
	const server = createJSONAPIHandlers(schema, store);

	Object.keys(schema.resources).forEach((type) => {
		app.get(`/${type}`, server.getAllHandler(type));
		app.get(`/${type}/:id`, server.getOneHandler(type));
		app.post(`/${type}`, server.createHandler(type));
		app.patch(`/${type}/:id`, server.updateHandler(type));
		app.delete(`/${type}/:id`, server.deleteHandler(type));
	});
}

/**
 * Creates a complete Express server with JSON:API endpoints
 * @param {import("@spectragraph/core").Schema} schema - The schema defining resources
 * @param {*} store - The data store instance
 * @param {Options} [options={}] - Server configuration options
 */
export function createServer(schema, store, options = {}) {
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
