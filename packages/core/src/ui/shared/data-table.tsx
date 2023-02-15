import { Component, For } from "solid-js";
import ActionsIcon from "../../icons/settings-gear-icon.svg";
import FilterIcon from "../../icons/filter-line-icon.svg";
import SearchIcon from "../../icons/search-icon.svg";
import { useDataTable } from "../../contexts/data-table-context.jsx";
import "./data-table.scss";
import "../standards.scss";

const perPage = 100;

export const DataTable: Component = () => {
	const [dataTable, setDataTableState] = useDataTable();
	const totalPages = Math.ceil(dataTable.source.records.length / perPage);

	return (
		<>
			<header class="controls">
				<div class="title">{dataTable.source.title ?? "CSV Data"}</div>
				<button type="button" class="control search">
					<SearchIcon />
				</button>
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
							<For each={Object.keys(dataTable.source.records?.[0] ?? {})}>
								{(col) => <th class={col.length > 40 ? "long" : ""}>{col}</th>}
							</For>
						</tr>
					</thead>
					<tbody>
						<For
							each={dataTable.source.records.slice(
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
						{Math.min(dataTable.page * perPage, dataTable.source.records.length)} of{" "}
						{dataTable.source.records.length}
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
						disabled={dataTable.page === totalPages}
						onClick={() =>
							setDataTableState({ page: Math.min(totalPages, dataTable.page + 1) })
						}
					>
						&gt;
					</button>
				</div>
			</footer>
		</>
	);
};
