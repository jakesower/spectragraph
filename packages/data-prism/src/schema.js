/**
 * @typedef {Object} SchemaAttribute
 * @property {"object"|"array"|"boolean"|"string"|"number"|"integer"|"null"|"date"|"time"|"date-time"|"iso-time"|"iso-date-time"|"duration"|"uri"|"uri-reference"|"uri-template"|"url"|"email"|"hostname"|"ipv4"|"ipv6"|"regex"|"uuid"|"json-pointer"|"relative-json-pointer"|"byte"|"int32"|"int64"|"float"|"double"|"password"|"binary"|"data-prism:geojson"|"data-prism:geojson-point"} type
 * @property {string} [title]
 * @property {string} [description]
 * @property {*} [default]
 * @property {string} [$comment]
 * @property {boolean} [deprecated]
 * @property {*} [meta]
 * @property {boolean} [required]
 * @property {string} [subType]
 */

/**
 * @typedef {Object} SchemaRelationship
 * @property {string} type
 * @property {"one"|"many"} cardinality
 * @property {string} [inverse]
 * @property {boolean} [required]
 */

/**
 * @typedef {Object} SchemaResource
 * @property {string} [idAttribute]
 * @property {Object<string, SchemaAttribute>} attributes
 * @property {Object<string, SchemaRelationship>} relationships
 */

/**
 * @typedef {Object} Schema
 * @property {string} [$schema]
 * @property {string} [$id]
 * @property {string} [title]
 * @property {string} [description]
 * @property {*} [meta]
 * @property {string} [version]
 * @property {Object<string, SchemaResource>} resources
 */

const attributeTypes = [
	"object",
	"array",
	"boolean",
	"string",
	"number",
	"integer",
	"null",
	"date",
	"time",
	"date-time",
	"iso-time",
	"iso-date-time",
	"duration",
	"uri",
	"uri-reference",
	"uri-template",
	"url",
	"email",
	"hostname",
	"ipv4",
	"ipv6",
	"regex",
	"uuid",
	"json-pointer",
	"relative-json-pointer",
	"byte",
	"int32",
	"int64",
	"float",
	"double",
	"password",
	"binary",
	"data-prism:geojson",
	"data-prism:geojson-point",
];

/**
 * Validates that a schema is valid
 * @param {*} schema - The schema to validate
 * @throws {Error} If the schema is invalid
 */
export function ensureValidSchema(schema) {
	if (typeof schema !== "object") {
		throw new Error("The schema must be an object.");
	}

	if (!("resources" in schema) || Array.isArray(schema.resources)) {
		throw new Error(
			'Invalid schema. The schema must have a "resources" object with valid resources as values.',
		);
	}

	Object.entries(schema.resources).forEach(([resKey, resource]) => {
		if (!("attributes" in resource) || Array.isArray(resource.attributes)) {
			throw new Error(
				`Invalid schema. Each schema resource must have an "attributes" object with valid resource attributes as values. Check the "${resKey}" resource.`,
			);
		}

		const idAttribute = resource.idAttribute ?? "id";
		if (!(idAttribute in resource.attributes)) {
			throw new Error(
				`Invalid schema. An id attribute is required. Please ensure the "${idAttribute}" attribute is defined on resource type "${resKey}".`,
			);
		}

		Object.entries(resource.attributes).forEach(
			([attrKey, attribute]) => {
				if (!attribute.type) {
					throw new Error(
						`Invalid schema. All attributes must have a type. Check the "${attrKey}" attribute on the "${resKey}" resource type.`,
					);
				}

				if (!attributeTypes.includes(attribute.type)) {
					throw new Error(
						`Invalid schema. "${attribute.type}" is not a valid type. Check the "${attrKey}" attribute on the "${resKey}" resource type. Valid types: ${attributeTypes.join(", ")}.`,
					);
				}
			},
		);

		if (
			!("relationships" in resource) ||
			Array.isArray(resource.relationships)
		) {
			throw new Error(
				`Invalid schema. Each schema resource must have an "relationships" object with valid resource relationships as values. Check the "${resKey}" resource.`,
			);
		}

		Object.entries(resource.relationships).forEach(
			([relKey, relationship]) => {
				if (!relationship.cardinality || !relationship.type) {
					throw new Error(
						`Invalid schema. All relationships must have a cardinality or a type. Check the "${relKey}" relationship on the "${resKey}" resource type.`,
					);
				}

				if (
					relationship.cardinality !== "one" &&
					relationship.cardinality !== "many"
				) {
					throw new Error(
						`Invalid schema. Relationship cardinality must be either "one" or "many". Check the "${relKey}" relationship on the "${resKey}" resource type.`,
					);
				}

				if (!Object.keys(schema.resources).includes(relationship.type)) {
					throw new Error(
						`Invalid schema. "${relationship.type}" is not a valid relationship type. Relationship types must be a type of resource defined in the schema. Check the "${relKey}" relationship on the "${resKey}" resource type. Valid resource type: ${Object.keys(schema.resources).join(", ")}`,
					);
				}
			},
		);
	});
}