import { formatRequest } from "./format-request.js";
import { parseResponse } from "./parse-response.js";

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

		async create(_resource) {
			throw new Error("create method not implemented for JSON:API store");
		},

		async update(_resource) {
			throw new Error("update method not implemented for JSON:API store");
		},

		async delete(_resource) {
			throw new Error("delete method not implemented for JSON:API store");
		},

		async upsert(_resource) {
			throw new Error("upsert method not implemented for JSON:API store");
		},
	};
}
