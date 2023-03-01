export function classList(items: { [k: string]: boolean }): string {
	return Object.keys(items)
		.filter((k) => items[k])
		.join(" ");
}
