// Schemas
import careBearSchema from "./schemas/care-bear-schema.json" with { type: "json" };
import soccerSchema from "./schemas/soccer-schema.json" with { type: "json" };
import geojsonSchema from "./schemas/geojson.schema.json" with { type: "json" };
import jsonApiSchema from "./schemas/json-api-schema.json" with { type: "json" };
import jsonSchemaTestingSchema from "./schemas/json-schema-testing-schema.json" with { type: "json" };

// Data
import careBearData from "./data/care-bear-data.json" with { type: "json" };
import careBearDataFlat from "./data/care-bear-data-flat.json" with { type: "json" };

export {
	// Schemas
	careBearSchema,
	soccerSchema,
	geojsonSchema,
	jsonApiSchema,
	jsonSchemaTestingSchema,

	// Data
	careBearData,
	careBearDataFlat,
};
