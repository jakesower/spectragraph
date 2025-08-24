/**
 * @typedef {Object} ColumnModifier
 * @property {(val: string) => any} extract - Function to extract/parse stored value
 * @property {(col: string) => string} select - Function to generate SQL for selecting value
 */

/**
 * Column type modifiers for different data types in PostgreSQL
 * @type {Object<string, ColumnModifier>}
 */
export const columnTypeModifiers = {
	geojson: {
		extract: (val) => JSON.parse(val),
		select: (val) => `ST_AsGeoJSON(${val})`,
	},
};
