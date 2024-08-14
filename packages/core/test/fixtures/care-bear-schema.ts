export const careBearSchema = {
	$schema:
		"https://raw.githubusercontent.com/jakesower/data-prism/main/schemas/data-prism-schema.1.0.schema.json",
	resources: {
		bears: {
			idAttribute: "id",
			attributes: {
				name: { type: "string" },
				yearIntroduced: { type: "number" },
				bellyBadge: { type: "string" },
				furColor: { type: "string" },
			},
			relationships: {
				home: {
					cardinality: "one",
					type: "homes",
					inverse: "residents",
				},
				powers: {
					cardinality: "many",
					type: "powers",
					inverse: "wielders",
				},
				bestFriend: {
					cardinality: "one",
					type: "bears",
					inverse: "bestFriend",
				},
			},
		},
		homes: {
			idAttribute: "id",
			attributes: {
				name: { type: "string" },
				location: { type: "string" },
				caringMeter: { type: "number" },
				isInClouds: { type: "boolean" },
			},
			relationships: {
				residents: {
					cardinality: "many",
					type: "bears",
					inverse: "home",
				},
			},
		},
		powers: {
			idAttribute: "powerId",
			attributes: {
				name: { type: "string" },
				description: { type: "string" },
				type: { type: "string" },
			},
			relationships: {
				wielders: {
					type: "bears",
					cardinality: "many",
					inverse: "powers",
				},
			},
		},
	},
} as const;
