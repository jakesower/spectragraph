export const columnTypeModifiers = {
	geojson: {
		extract: (val) => JSON.parse(val),
		select: (val) => `ST_AsGeoJSON(${val})`,
	},
};
