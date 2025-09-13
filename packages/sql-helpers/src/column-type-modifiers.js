/**
 * @typedef {Object} ColumnModifier
 * @property {(val: any) => any} extract - Function to extract/parse stored value
 * @property {(col: string) => string} select - Function to generate SQL for selecting value
 * @property {(val: any) => any} [store] - Function to transform value before storing (optional)
 */

/**
 * Base column type modifiers shared across SQL stores
 * @type {Object<string, ColumnModifier>}
 */
export const baseColumnTypeModifiers = {
	geojson: {
		extract: (val) => JSON.parse(val),
		select: (val) => `ST_AsGeoJSON(${val})`,
	},
};

/**
 * Creates column type modifiers with custom type handlers
 * @param {Object<string, ColumnModifier>} [customModifiers={}] - Custom type modifiers
 * @returns {Object<string, ColumnModifier>} Combined column type modifiers
 */
export function createColumnTypeModifiers(customModifiers = {}) {
	return {
		...baseColumnTypeModifiers,
		...customModifiers,
	};
}

/**
 * Transforms values for storage using column type modifiers
 * @param {any[]} values - Array of values to transform
 * @param {string[]} attributeNames - Array of attribute names corresponding to values
 * @param {import('spectragraph').ResourceSchema} resourceSchema - Resource schema
 * @param {Object<string, ColumnModifier>} columnTypeModifiers - Column type modifiers
 * @returns {any[]} Transformed values ready for storage
 */
export function transformValuesForStorage(
	values,
	attributeNames,
	resourceSchema,
	columnTypeModifiers,
) {
	return values.map((value, index) => {
		const attrName = attributeNames[index];
		const attrSchema = resourceSchema.attributes[attrName];
		const modifier = columnTypeModifiers[attrSchema?.type];

		return modifier?.store ? modifier.store(value) : value;
	});
}
