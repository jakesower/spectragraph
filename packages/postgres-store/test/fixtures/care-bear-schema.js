export const careBearSchema = {
	$schema:
		"https://raw.githubusercontent.com/jakesower/spectragraph/main/schemas/spectragraph-schema.1.0.schema.json",
	resources: {
		bears: {
			idAttribute: "id",
			attributes: {
				id: { type: "string" },
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
			attributes: {
				id: { type: "string" },
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
				powerId: { type: "string" },
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
		companions: {
			idAttribute: "companionId",
			attributes: {
				companionId: { type: "string" },
				name: { type: "string" },
				description: { type: "string" },
			},
			relationships: {},
		},
		villains: {
			idAttribute: "id",
			attributes: {
				id: { type: "string" },
				name: { type: "string" },
			},
			relationships: {},
		},
	},
};