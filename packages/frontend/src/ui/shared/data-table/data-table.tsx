import { Component, For, Show } from "solid-js";
import ActionsIcon from "../../../icons/settings-gear-icon.svg";
import FilterIcon from "../../../icons/filter-line-icon.svg";
import SearchIcon from "../../../icons/search-icon.svg";
import { useDataTable } from "../../../contexts/data-table-context.jsx";
import "./data-table.scss";
import "../../standards.scss";
import { useSources } from "../../../contexts/source-context";

const perPage = 100;

export const DataTable: Component = () => {
	const [dataTable, setDataTableState] = useDataTable();
	const [sources] = useSources();

	return (
		<Show
			when={sources[dataTable.sourceKey]}
			fallback={<div class="no-data-table">Please select a source to view its data.</div>}
		>
			<>
				<header class="controls">
					<div class="title">{sources[dataTable.sourceKey].name ?? "CSV Data"}</div>
					<button type="button" class="control">
						<FilterIcon />
					</button>
					<button type="button" class="control">
						<ActionsIcon />
					</button>
				</header>
				<div class="data-table-wrapper">
					<table class="data-table standard">
						<thead>
							<tr>
								<For
									each={Object.keys(sources[dataTable.sourceKey].table?.rows?.[0] ?? {})}
								>
									{(col) => <th class={col.length > 40 ? "long" : ""}>{col}</th>}
								</For>
							</tr>
						</thead>
						<tbody>
							<For
								each={sources[dataTable.sourceKey].table.rows.slice(
									(dataTable.page - 1) * perPage,
									dataTable.page * perPage,
								)}
							>
								{(row) => (
									<tr>
										<For each={Object.values(row)}>{(cell) => <td>{cell}</td>}</For>
									</tr>
								)}
							</For>
						</tbody>
					</table>
				</div>
				<footer class="controls footer">
					<div class="page-nav">
						<div>
							{(dataTable.page - 1) * perPage + 1} -{" "}
							{Math.min(
								dataTable.page * perPage,
								sources[dataTable.sourceKey].table.rows.length,
							)}{" "}
							of {sources[dataTable.sourceKey].table.rows.length}
						</div>
						<button
							type="button"
							disabled={dataTable.page === 1}
							onClick={() => setDataTableState({ page: Math.max(1, dataTable.page - 1) })}
						>
							&lt;
						</button>
						<button
							type="button"
							disabled={
								dataTable.page ===
								Math.ceil(sources[dataTable.sourceKey].table.rows.length / perPage)
							}
							onClick={() =>
								setDataTableState({
									page: Math.min(
										Math.ceil(sources[dataTable.sourceKey].table.rows.length / perPage),
										dataTable.page + 1,
									),
								})
							}
						>
							&gt;
						</button>
					</div>
				</footer>
			</>
		</Show>
	);
};
