import express from "express";
import { formatResponse } from "./format-response.js";
import { parseRequest } from "./parse-request.js";
import { create } from "./create.js";
import { update } from "./update.js";
import { deleteHandler } from "./delete.js";
export function applySchemaRoutes(schema, store, app) {
    const handleRequest = (type) => async (req, res) => {
        try {
            const query = parseRequest(schema, {
                ...req.query,
                type,
                id: req.params.id,
            });
            const result = await store.query(query);
            const response = formatResponse(schema, query, result);
            res.json(response);
        }
        catch {
            res.statusCode = 500;
            res.send("something went wrong");
        }
    };
    Object.keys(schema.resources).forEach((type) => {
        app.get(`/${type}`, handleRequest(type));
        app.get(`/${type}/:id`, handleRequest(type));
        app.post(`/${type}`, create(store));
        app.patch(`/${type}/:id`, update(store));
        app.delete(`/${type}/:id`, deleteHandler(type, store));
    });
}
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
