const $nowLocal = {
	name: "$nowLocal",
	apply: () => {
		const now = new Date();
		const offset = -now.getTimezoneOffset();
		const sign = offset >= 0 ? "+" : "-";
		const hours = Math.floor(Math.abs(offset) / 60)
			.toString()
			.padStart(2, "0");
		const minutes = (Math.abs(offset) % 60).toString().padStart(2, "0");
		return now.toISOString().slice(0, -1) + sign + hours + ":" + minutes;
	},
	evaluate() {
		return this.apply();
	},
};

const $nowUTC = {
	name: "$nowUTC",
	apply: () => new Date().toISOString(),
	evaluate() {
		return this.apply();
	},
};

const $timestamp = {
	name: "$timestamp",
	apply: () => Date.now(),
	evaluate() {
		return this.apply();
	},
};

export const temporalDefinitions = {
	$nowLocal,
	$nowUTC,
	$timestamp,
};
