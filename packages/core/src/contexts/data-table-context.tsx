import { createContext, createEffect, mergeProps, useContext } from "solid-js";
import { createStore, SetStoreFunction } from "solid-js/store";
import { Source } from "../data/source";
import { useSources } from "./source-context";

type InternalDataTable = {
	sourceKey: string;
	filters?: any;
	sorting?: any;
	page: number;
} | null;

export type DataTable = InternalDataTable;

const defaultDataTableState = { sourceKey: "", filters: [], sorting: [], page: 1 };

const DataTableContext = createContext<[DataTable, SetStoreFunction<DataTable>]>();

export function DataTableProvider(props) {
	const [sources] = useSources();
	// const stored = localStorage.getItem("data-table");
	const stored = null;
	const init =
		stored && false
			? JSON.parse(stored)
			: { sourceKey: "", filters: [], sorting: [], page: 1 };

	const [internalDataTable, setInternalDataTable] = createStore<InternalDataTable>(init);
	// const dataTableX = internalDataTable
	// 	? mergeProps(internalDataTable, { source: sources[internalDataTable.sourceKey] })
	// 	: null;

	// const dataTable = {
	// 	...internalDataTable,
	// 	get source() {
	// 		return sources[internalDataTable.sourceKey];
	// 	},
	// 	setDataTable: setInternalDataTable,
	// 	switchSource(sourceKey: string) {
	// 		setInternalDataTable({ ...defaultDataTableState, sourceKey: sourceKey });
	// 	},
	// };

	// const setDataTable = {
	// 	...setInternalDataTable,
	// 	switchSource(sourceKey) {
	// 		setInternalDataTable({ ...defaultDataTableState, sourceKey });
	// 	},
	// };
	// console.log(internalDataTable.sourceKey);

	// createEffect(() => {
	// 	localStorage.setItem("data-table", JSON.stringify(dataTable));
	// });

	return (
		<DataTableContext.Provider value={[internalDataTable, setInternalDataTable]}>
			{props.children}
		</DataTableContext.Provider>
	);
}

export function useDataTable() {
	return useContext(DataTableContext);
}
