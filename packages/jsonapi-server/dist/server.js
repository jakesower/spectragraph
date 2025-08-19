"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJSONAPIHandlers = createJSONAPIHandlers;
exports.applySchemaRoutes = applySchemaRoutes;
exports.createServer = createServer;
var express_1 = __importDefault(require("express"));
var create_js_1 = require("./create.js");
var update_js_1 = require("./update.js");
var delete_js_1 = require("./delete.js");
var get_js_1 = require("./get.js");
function createJSONAPIHandlers(schema, store) {
    return {
        getAllHandler: function (type) { return (0, get_js_1.get)(schema, store, type); },
        getOneHandler: function (type) { return (0, get_js_1.get)(schema, store, type); },
        createHandler: function () { return (0, create_js_1.create)(schema, store); },
        updateHandler: function () { return (0, update_js_1.update)(store); },
        deleteHandler: function (type) { return (0, delete_js_1.deleteHandler)(type, store); },
    };
}
function applySchemaRoutes(schema, store, app) {
    var server = createJSONAPIHandlers(schema, store);
    Object.keys(schema.resources).forEach(function (type) {
        app.get("/".concat(type), server.getAllHandler(type));
        app.get("/".concat(type, "/:id"), server.getOneHandler(type));
        app.post("/".concat(type), server.createHandler(type));
        app.patch("/".concat(type, "/:id"), server.updateHandler(type));
        app.delete("/".concat(type, "/:id"), server.deleteHandler(type));
    });
}
function createServer(schema, store, options) {
    if (options === void 0) { options = {}; }
    var app = (0, express_1.default)();
    app.use(express_1.default.json());
    var _a = options.port, port = _a === void 0 ? 3000 : _a;
    applySchemaRoutes(schema, store, app);
    app.get("/", function (req, res) {
        res.send("OK");
    });
    app.listen(port, "0.0.0.0", function () {
        console.log("running on port ".concat(port));
    });
}
