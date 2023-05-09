export const careBearsConfig = {
	resources: {
		bears: {
			table: "bears",
			joins: {
				bestFriend: { localColumn: "best_friend_id" },
				home: { localColumn: "home_id" },
				powers: { joinTable: "bears_powers", joinColumn: "bear_id" },
			},
		},
		homes: {
			table: "homes",
			joins: {
				residents: { foreignTable: "bears", foreignColumn: "home_id" },
			},
		},
		powers: {
			table: "powers",
			joins: {
				wielders: { joinTable: "bears_powers", joinColumn: "power_id" },
			},
		},
	},
} as const;
