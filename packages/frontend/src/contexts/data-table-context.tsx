import {
	createContext,
	createEffect,
	createMemo,
	mergeProps,
	useContext,
} from "solid-js";
import { createMemoryStore, SetStoreFunction } from "solid-js/store";
import { Source } from "../data/source";
import { useSources } from "./source-context";
import { deriveOperations } from "../ui/sections/remix/remix-operations";

export type RemixOperation = {
	type: "derivative";
	function: string;
	arguments: any;
};

type DataTable = {
	sourceKey: string;
	filters?: any[];
	sorting?: any[];
	page: number;
	remixOperations: RemixOperation[];
} | null;

const defaultDataTableState: DataTable = {
	sourceKey: "",
	filters: [],
	sorting: [],
	page: 1,
	remixOperations: [],
};

const DataTableContext = createContext<[DataTable, SetStoreFunction<DataTable>]>();

export function DataTableProvider(props) {
	const [sources] = useSources();
	// const stored = localStorage.getItem("data-table");
	const stored = null;
	const init: DataTable = stored ? JSON.parse(stored) : defaultDataTableState;

	const [dataTable, setDataTable] = createMemoryStore<DataTable>(init);

	const remixed = createMemo(() => {
		const rootSource = sources[dataTable.sourceKey];
		const rootTable = rootSource?.table;

		return dataTable.remixOperations.reduce((acc, op) => {
			const { fn } = deriveOperations.mathjs;
			return fn(acc, op.arguments);
		}, rootTable);
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
