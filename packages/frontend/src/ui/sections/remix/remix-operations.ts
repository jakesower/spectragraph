import * as math from "mathjs";
import { Table, detectBaseColumnType, detectColumnSlotTypes } from "../../../data/source";

type OperationDefinition = {
	arguments: {
		name: string;
		implicit?: boolean;
		title?: string;
		type: "string";
	}[];
	fn: (table: Table, args: any) => Table;
};

export const deriveOperations: { [k: string]: OperationDefinition } = {
	mathjs: {
		arguments: [
			{ name: "expression", implicit: true, title: "MathJS Expression", type: "string" },
		],
		fn: (table: Table, args): Table => {
			const mathFn = math.compile(args);
			const nextColumnVals = [];
			const rows = table.rows.map((row) => {
				console.log({ table, args, row });
				const result = mathFn.evaluate(row);
				nextColumnVals.push(result);
				return { ...row, thing: result };
			});

			const columns = {
				...table.columns,
				thing: {
					type: detectBaseColumnType(nextColumnVals),
					slotTypes: detectColumnSlotTypes(nextColumnVals),
					values: nextColumnVals,
					name: "thing",
				},
			};

			console.log("cols", columns);
			console.log("rows", rows);
			return {
				rows,
				columns,
			};
		},
	},
};
