import { formatRequest } from "./format-request.js";
import { parseResponse } from "./parse-response.js";
import { StoreOperationNotSupportedError } from "@data-prism/core";

/**
 * Creates a JSON:API store that proxies requests to a remote JSON:API server
 * @param {import("@data-prism/core").Schema} schema - Data Prism schema
 * @param {Object} config - Store configuration
 * @param {Object} config.transport - HTTP transport implementation
 * @param {string} config.baseURL - Base URL for the JSON:API server
 * @returns {import("@data-prism/core").Store} Store instance implementing the core Store interface
 */
export function createJSONAPIStore(schema, config) {
	const { transport } = config;

	const makeRequest = (req) => {
		try {
			return transport.get(req);
		} catch (err) {
			throw new Error({ ...err, transportError: true });
		}
	};

	return {
		async query(query) {
			try {
				const req = formatRequest(schema, config, query);
				const res = await makeRequest(req);

				return parseResponse(schema, query, res);
			} catch (err) {
				if (err.transportError && err.response?.statusCode === 404) {
					return null;
				}

				throw err;
			}
		},

		async create() {
			throw new StoreOperationNotSupportedError("create", "jsonapi-store");
		},

		async update() {
			throw new StoreOperationNotSupportedError("update", "jsonapi-store");
		},

		async delete() {
			throw new StoreOperationNotSupportedError("delete", "jsonapi-store");
		},

		async upsert() {
			throw new StoreOperationNotSupportedError("upsert", "jsonapi-store");
		},

		async merge() {
			throw new StoreOperationNotSupportedError("merge", "jsonapi-store");
		},
	};
}
