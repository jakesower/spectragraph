export const careBearConfig = {
	resources: {
		bears: {
			table: "bears",
			idType: "varchar NOT NULL DEFAULT uuid_generate_v4()",
			columns: {
				name: {
					select: (table, col) => `${table}.${col}::text`,
				},
			},
			joins: {
				bestFriend: {
					localColumn: "best_friend_id",
					localColumnType: "varchar",
				},
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
			table: "home.homes",
			idType: "varchar NOT NULL DEFAULT uuid_generate_v4()",
			joins: {
				residents: {
					foreignColumn: "home_id",
					foreignColumnType: "varchar",
				},
			},
		},
		powers: {
			table: "power", // non-standard
			idAttribute: "powerId",
			idType: "varchar NOT NULL DEFAULT uuid_generate_v4()",
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
		companions: {
			table: "companion",
			idType: "varchar",
		},
	},
};