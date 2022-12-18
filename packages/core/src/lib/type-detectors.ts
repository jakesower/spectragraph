export type Detector = {
	name: string;
	test: (val: any) => boolean;
};

export const typeDetectors: Detector[] = [
	{ name: "number", test: (val) => Number.isFinite(val) },
	{
		name: "positive",
		test: (val) => Number.isFinite(val) && Number.isFinite(val) && val > 0,
	},
	{
		name: "non-negative",
		test: (val) => Number.isFinite(val) && Number.isFinite(val) && val >= 0,
	},
	{
		name: "negative",
		test: (val) => Number.isFinite(val) && Number.isFinite(val) && val < 0,
	},
	{
		name: "non-positive",
		test: (val) => Number.isFinite(val) && Number.isFinite(val) && val <= 0,
	},
	{
		name: "integer",
		test: (val) => Number.isInteger(val),
	},
];
