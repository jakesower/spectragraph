import { ColumnType, columnTypeTests } from "./column-type-detectors";

export type Property = {
	type: "string" | "boolean" | "array" | "object" | "integer" | "number" | "null";
	title?: string;
	description?: string;
	[k: string]: unknown;
};

export type Record = { [k: string]: string | number | boolean | null };
export type Column = {
	description?: string;
	title?: string;
	types: ColumnType[];
	values: (string | number | boolean | null)[];
};
export type ColumnObj = { [k: string]: Column };
export type Schema = { properties: { [k: string]: Property } };
export type Source = { columns: ColumnObj; records: Record[]; schema?: Schema };

function detectColumnTypes(vals: string[]): ColumnType[] {
	const columnTypes = Object.keys(columnTypeTests) as (keyof typeof columnTypeTests)[];
	return columnTypes.filter((testName) => vals.every(columnTypeTests[testName].test));
}

export function detectColumns(rawCsvRecords: { [k: string]: string }[]): ColumnObj {
	if (rawCsvRecords.length === 0) return {};

	const columnNames = Object.keys(rawCsvRecords[0]);

	// TODO: this is wildly inefficient
	return columnNames.reduce((acc, colName) => {
		const columnValues = rawCsvRecords.map((r) => r[colName]);

		return {
			...acc,
			[colName]: {
				types: detectColumnTypes(rawCsvRecords.map((r) => r[colName])),
				values: columnValues,
			},
		};
	}, {});
}
