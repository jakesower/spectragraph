/**
 * @typedef {Object} ColumnTypeModifier
 * @property {function(any): any} [castForValidation]
 * @property {Object} [schemaProperties]
 * @property {string} schemaProperties.type
 * @property {string} [schemaProperties.format]
 * @property {string} [schemaProperties.$ref]
 * @property {Object<string, {
 *   castForValidation?: function(any): any,
 *   schemaProperties?: {
 *     type: string,
 *     format?: string,
 *     $ref?: string
 *   }
 * }>} [subTypes]
 */

/**
 * @type {Object<string, ColumnTypeModifier>}
 */
export const columnTypeModifiers = {
	// ajv formats
	date: {
		schemaProperties: { type: "string", format: "date" },
		castForValidation: (val) =>
			val instanceof Date ? val.toISOString().split("T")[0] : val,
	},
	time: {
		schemaProperties: { type: "string", format: "time" },
		castForValidation: (val) =>
			val instanceof Date ? val.toISOString().split("T")[1] : val,
	},
	"date-time": {
		schemaProperties: {
			type: "string",
			format: "date-time",
		},
		castForValidation: (val) => (val instanceof Date ? val.toISOString() : val),
	},
	duration: { schemaProperties: { type: "string", format: "duration" } },
	uri: { schemaProperties: { type: "string", format: "uri" } },
	"uri-reference": {
		schemaProperties: { type: "string", format: "uri-reference" },
	},
	url: { schemaProperties: { type: "string", format: "url" } },
	email: { schemaProperties: { type: "string", format: "email" } },
	hostname: { schemaProperties: { type: "string", format: "hostname" } },
	ipv4: { schemaProperties: { type: "string", format: "ipv4" } },
	ipv6: { schemaProperties: { type: "string", format: "ipv6" } },
	regex: { schemaProperties: { type: "string", format: "regex" } },
	uuid: { schemaProperties: { type: "string", format: "uuid" } },
	"json-pointer": {
		schemaProperties: { type: "string", format: "json-pointer" },
	},
	"relative-json-pointer": {
		schemaProperties: { type: "string", format: "relative-json-pointer" },
	},
};
