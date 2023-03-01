export function transpose<T>(array: T[][]): T[][] {
	if (array.length === 0) return [];

	const firstRow = array[0];
	const numColumns = firstRow.length;
	const output = firstRow.map(() => []);

	for (let i = 0; i < array.length; i += 1) {
		for (let j = 0; j < numColumns; j += 1) {
			output[i][j] = array[j][i];
		}
	}

	return output;
}
