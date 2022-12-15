export const typeDetectors = [
	{ name: "number", test: (val) => Number.isNumber(val) },
	{
		name: "positiveNumber",
		test: (val) => Number.isNumber(val) && Number.isFinite(val) && val > 0,
	},
];
