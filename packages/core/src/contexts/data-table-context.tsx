import { createContext, createEffect, useContext } from "solid-js";
import { createStore, SetStoreFunction } from "solid-js/store";
import { Source } from "../data/source";
import { useSources } from "./source-context";

export type DataTable = {
	source: Source;
	filters?: any;
	sorting?: any;
	page: number;
} | null;

const DataTableContext = createContext<[DataTable, SetStoreFunction<DataTable>]>();

export function DataTableProvider(props) {
	const [sources] = useSources();
	// const stored = localStorage.getItem("data-table");
	const stored = null;
	const init = stored
		? JSON.parse(stored)
		: { source: sources.csv, filters: [], sorting: [], page: 1 };
	const [dataTable, setDataTable] = createStore<DataTable>(init);

	createEffect(() => {
		localStorage.setItem("data-table", JSON.stringify(dataTable));
	});

	return (
		<DataTableContext.Provider value={[dataTable, setDataTable]}>
			{props.children}
		</DataTableContext.Provider>
	);
}

export function useDataTable() {
	return useContext(DataTableContext);
}
