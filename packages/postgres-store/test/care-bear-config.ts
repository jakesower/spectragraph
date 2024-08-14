export const careBearConfig = {
	resources: {
		bears: {
			table: "bears",
			idType: "varchar",
			joins: {
				bestFriend: { localColumn: "best_friend_id", localColumnType: "varchar" },
				home: { localColumn: "home_id", localColumnType: "varchar" },
				powers: {
					joinTable: "bears_powers",
					localJoinColumn: "bear_id",
					localColumnType: "varchar",
					foreignJoinColumn: "power_id",
				},
			},
		},
		homes: {
			table: "homes",
			idType: "varchar",
			joins: {
				residents: {
					foreignTable: "bears",
					foreignColumn: "home_id",
					foreignColumnType: "varchar",
				},
			},
		},
		powers: {
			table: "powers",
			idAttribute: "powerId",
			idType: "varchar",
			joins: {
				wielders: {
					joinTable: "bears_powers",
					localJoinColumn: "power_id",
					localColumnType: "varchar",
					foreignJoinColumn: "bear_id",
					foreignColumnType: "varchar",
				},
			},
		},
	},
} as const;
