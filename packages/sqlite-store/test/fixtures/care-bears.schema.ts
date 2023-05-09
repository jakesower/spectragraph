export const careBearSchema = {
	$schema:
		"file:///home/jake/dev/data-prism/packages/frontend/src/schemas/data-prism-schema.1.0.0.schema.json",
	resources: {
		bears: {
			idField: "id",
			properties: {
				name: { type: "string" },
				yearIntroduced: { type: "number" },
				bellyBadge: { type: "string" },
				furColor: { type: "string" },
			},
			relationships: {
				home: {
					cardinality: "one",
					resource: "homes",
					inverse: "residents",
				},
				powers: {
					cardinality: "many",
					resource: "powers",
					inverse: "wielders",
				},
				bestFriend: {
					cardinality: "one",
					resource: "bears",
					inverse: "bestFriend",
				},
			},
		},
		homes: {
			idField: "id",
			properties: {
				name: { type: "string" },
				location: { type: "string" },
				caringMeter: { type: "number" },
				isInClouds: { type: "boolean" },
			},
			relationships: {
				residents: {
					cardinality: "many",
					resource: "bears",
					inverse: "home",
				},
			},
		},
		powers: {
			idField: "powerId",
			properties: {
				name: { type: "string" },
				description: { type: "string" },
				type: { type: "string" },
			},
			relationships: {
				wielders: {
					resource: "bears",
					cardinality: "many",
					inverse: "powers",
				},
			},
		},
	},
} as const;
