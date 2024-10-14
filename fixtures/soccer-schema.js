export const soccerSchema = {
	$schema:
		"https://raw.githubusercontent.com/jakesower/data-prism/main/schemas/data-prism-schema.1.0.schema.json",
	resources: {
		fields: {
			attributes: {
				name: { type: "string", pattern: "^[A-Z][A-Za-z0-9 ]+" },
				location: { $ref: "https://jakesower.com/schemas/geojson.schema.json#/definitions/Point" },
			},
			relationships: {
				teams: {
					type: "fields",
					cardinality: "many",
					inverse: "homeField",
				},
			},
		},
		games: {
			idAttribute: "id",
			attributes: {
				homeScore: { type: "integer", required: true, minimum: 0 },
				awayScore: { type: "integer", required: true, minimum: 0 },
			},
			relationships: {
				homeTeam: {
					cardinality: "one",
					type: "teams",
					inverse: "homeGames",
				},
				awayTeam: {
					cardinality: "one",
					type: "teams",
					inverse: "awayGames",
				},
				referee: {
					cardinality: "one",
					type: "referees",
					inverse: "games",
				},
			},
		},
		referees: {
			attributes: {
				name: { type: "string", required: true },
			},
			relationships: {
				games: {
					type: "games",
					cardinality: "many",
					inverse: "referee",
				},
			},
		},
		teams: {
			idAttribute: "id",
			attributes: {
				name: { type: "string", required: true },
				homeColor: { type: "string" },
				awayColor: { type: "string" },
			},
			relationships: {
				homeGames: {
					cardinality: "many",
					type: "games",
					inverse: "homeTeam",
				},
				awayGames: {
					cardinality: "many",
					type: "games",
					inverse: "homeTeam",
				},
				homeField: {
					cardinality: "one",
					type: "fields",
					inverse: "teams",
					required: true,
				},
			},
		},
	},
};
