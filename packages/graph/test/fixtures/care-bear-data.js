export const careBearData = {
	bears: {
		1: {
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
			attributes: {
				id: "3",
				name: "Wish Bear",
				yearIntroduced: 1982,
				bellyBadge: "shooting star",
				furColor: "turquoise",
			},
			relationships: {
				home: { type: "homes", id: "1" },
				powers: [{ type: "powers", id: "careBearStare" }],
				bestFriend: { type: "bears", id: "2" },
			},
		},
		5: {
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
				powers: [{ type: "powers", id: "careBearStare" }],
			},
		},
	},
	homes: {
		1: {
			attributes: {
				id: "1",
				name: "Care-a-Lot",
				location: "Kingdom of Caring",
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
			attributes: {
				id: "2",
				name: "Forest of Feelings",
				location: "Kingdom of Caring",
				caringMeter: 1,
				isInClouds: false,
			},
			relationships: {
				residents: [],
			},
		},
		3: {
			attributes: {
				id: "3",
				name: "Earth",
				location: "Earth",
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
					{ type: "bears", id: "5" },
				],
			},
		},
		makeWish: {
			attributes: {
				powerId: "makeWish",
				name: "Make a Wish",
				description: "Makes a wish on Twinkers",
				type: "individual power",
			},
			relationships: {
				wielders: [],
			},
		},
	},
	companions: {},
};
