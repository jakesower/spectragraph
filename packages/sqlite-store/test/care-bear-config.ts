export const careBearConfig = {
	resources: {
		bears: {
			table: "bears",
			joins: {
				bestFriend: { localColumn: "best_friend_id" },
				home: { localColumn: "home_id" },
				powers: {
					joinTable: "bears_powers",
					localJoinColumn: "bear_id",
					foreignJoinColumn: "power_id",
				},
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
			idField: "powerId",
			joins: {
				wielders: {
					joinTable: "bears_powers",
					localJoinColumn: "power_id",
					foreignJoinColumn: "bear_id",
				},
			},
		},
	},
} as const;
