export const careBearData = {
	bears: {
		1: {
			type: "bears",
			id: "1",
			attributes: {
				id: "1",
				name: "Tenderheart Bear",
				yearIntroduced: 1982,
				bellyBadge: "red heart with pink outline",
				furColor: "tan",
			},
			relationships: {
				bestFriend: null,
				home: { type: "homes", id: "1" },
				powers: [{ type: "powers", id: "careBearStare" }],
			},
		},
		2: {
			type: "bears",
			id: "2",
			attributes: {
				id: "2",
				name: "Cheer Bear",
				yearIntroduced: 1982,
				bellyBadge: "rainbow",
				furColor: "carnation pink",
			},
			relationships: {
				home: { type: "homes", id: "1" },
				powers: [{ type: "powers", id: "careBearStare" }],
				bestFriend: { type: "bears", id: "3" },
			},
		},
		3: {
			type: "bears",
			id: "3",
			attributes: {
				id: "3",
				name: "Wish Bear",
				yearIntroduced: 1982,
				bellyBadge: "shooting star",
				furColor: "turquoise",
			},
			relationships: {
				home: { type: "homes", id: "1" },
				powers: [
					{ type: "powers", id: "careBearStare" },
					{ type: "powers", id: "makeWish" },
				],
				bestFriend: { type: "bears", id: "2" },
			},
		},
		5: {
			type: "bears",
			id: "5",
			attributes: {
				id: "5",
				name: "Smart Heart Bear",
				yearIntroduced: 2005,
				bellyBadge: "red apple with a small white heart-shaped shine",
				furColor: "watermelon pink",
			},
			relationships: {
				bestFriend: null,
				home: null,
				powers: [],
			},
		},
	},
	homes: {
		1: {
			type: "homes",
			id: "1",
			attributes: {
				id: "1",
				name: "Care-a-Lot",
				location: {
					type: "Point",
					coordinates: [-119.557320248, 46.820255868],
				},
				caringMeter: 1,
				isInClouds: true,
			},
			relationships: {
				residents: [
					{ type: "bears", id: "1" },
					{ type: "bears", id: "2" },
					{ type: "bears", id: "3" },
				],
			},
		},
		2: {
			type: "homes",
			id: "2",
			attributes: {
				id: "2",
				name: "Forest of Feelings",
				location: { type: "Point", coordinates: [119, -46] },
				caringMeter: 1,
				isInClouds: false,
			},
			relationships: {
				residents: [],
			},
		},
		3: {
			type: "homes",
			id: "3",
			attributes: {
				id: "3",
				name: "Earth",
				location: { type: "Point", coordinates: [0, 0] },
				caringMeter: 0.5,
				isInClouds: false,
			},
			relationships: {
				residents: [],
			},
		},
	},
	powers: {
		careBearStare: {
			type: "powers",
			id: "careBearStare",
			attributes: {
				powerId: "careBearStare",
				name: "Care Bear Stare",
				description: "Purges evil.",
				type: "group power",
			},
			relationships: {
				wielders: [
					{ type: "bears", id: "1" },
					{ type: "bears", id: "2" },
					{ type: "bears", id: "3" },
				],
			},
		},
		makeWish: {
			type: "powers",
			id: "makeWish",
			attributes: {
				powerId: "makeWish",
				name: "Make a Wish",
				description: "Makes a wish on Twinkers",
				type: "individual power",
			},
			relationships: {
				wielders: [{ type: "bears", id: "3" }],
			},
		},
		transform: {
			type: "powers",
			id: "transform",
			attributes: {
				powerId: "transform",
				name: "Transform",
				description: "Transform into a kaiju",
				type: "individual power",
			},
			relationships: {
				wielders: [],
			},
		},
	},
	companions: {
		1: {
			type: "companions",
			id: "1",
			attributes: {
				companionId: "1",
				name: "Brave Heart Lion",
				description: "Strong and brave leader\nAlways ready to help\nLives in Care-a-Lot",
			},
			relationships: {},
		},
		2: {
			type: "companions",
			id: "2",
			attributes: {
				companionId: "2",
				name: "Cozy Heart Penguin",
				description: "Warm and caring friend.\nLoves to sing and dance.\nBrings joy to everyone.",
			},
			relationships: {},
		},
		3: {
			type: "companions",
			id: "3",
			attributes: {
				companionId: "3",
				name: "Loyal Heart Dog",
				description: "Faithful companion\nAlways loyal to friends\nHelps bears with tasks\nstart: Always loyal\nend: Never gives up",
			},
			relationships: {},
		},
	},
	villains: {},
};
