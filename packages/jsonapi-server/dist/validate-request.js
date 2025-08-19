"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = validateRequest;
var ajv_1 = __importDefault(require("ajv"));
var ajv_formats_1 = __importDefault(require("ajv-formats"));
var json_api_request_schema_json_1 = __importDefault(require("../fixtures/json-api-request.schema.json"));
var ajv = new ajv_1.default();
(0, ajv_formats_1.default)(ajv);
var validateRequestSchema = ajv.compile(json_api_request_schema_json_1.default);
function validateRequest(schema, body) {
    var valid = validateRequestSchema(body);
    if (!valid) {
        return validateRequestSchema.errors.map(function (err) { return ({
            status: "400",
            title: "Invalid request",
            description: "The request failed to pass the JSON:API schema validator. See meta for output.",
            meta: err,
        }); });
    }
    var data = body.data;
    if (!(data.type in schema.resources)) {
        return [
            {
                status: "400",
                title: "Invalid resource",
                description: "".concat(data.type, " is not a valid resource type"),
            },
        ];
    }
}
