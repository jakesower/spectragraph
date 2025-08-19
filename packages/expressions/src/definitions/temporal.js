const $nowLocal = {
	name: "$nowLocal",
	apply: () => {
		const now = new Date();
		const offset = -now.getTimezoneOffset();
		const sign = offset >= 0 ? "+" : "-";
		const hours = Math.floor(Math.abs(offset) / 60).toString().padStart(2, "0");
		const minutes = (Math.abs(offset) % 60).toString().padStart(2, "0");
		return now.toISOString().slice(0, -1) + sign + hours + ":" + minutes;
	},
	evaluate: () => {
		const now = new Date();
		const offset = -now.getTimezoneOffset();
		const sign = offset >= 0 ? "+" : "-";
		const hours = Math.floor(Math.abs(offset) / 60).toString().padStart(2, "0");
		const minutes = (Math.abs(offset) % 60).toString().padStart(2, "0");
		return now.toISOString().slice(0, -1) + sign + hours + ":" + minutes;
	},
	schema: {
		type: "string",
	},
};

const $nowUTC = {
	name: "$nowUTC", 
	apply: () => new Date().toISOString(),
	evaluate: () => new Date().toISOString(),
	schema: {
		type: "string",
	},
};

const $timestamp = {
	name: "$timestamp",
	apply: () => Date.now(),
	evaluate: () => Date.now(),
	schema: {
		type: "number",
	},
};

export const temporalDefinitions = {
	$nowLocal,
	$nowUTC,
	$timestamp,
};