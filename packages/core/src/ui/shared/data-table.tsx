import { Component, For, Show } from "solid-js";
import ActionsIcon from "../../icons/settings-gear-icon.svg";
import FilterIcon from "../../icons/filter-line-icon.svg";
import SearchIcon from "../../icons/search-icon.svg";
import { useDataTable } from "../../contexts/data-table-context.jsx";
import "./data-table.scss";
import "../standards.scss";
import { useSources } from "../../contexts/source-context";

const perPage = 100;

export const DataTable: Component = () => {
	const [dataTable, setDataTableState] = useDataTable();
	const [sources] = useSources();

	const source = sources[dataTable.sourceKey];

	// console.log('dt', dataTable)
	console.log("s", source, dataTable.sourceKey);

	// if (!source) return <div>{dataTable.sourceKey ?? "chicken butt"}</div>;

	const totalPages = 3; // Math.ceil(dataTable.source.records.length / perPage);

	return (
		<Show
			when={sources[dataTable.sourceKey]}
			fallback={<div class="no-data-table">Please select a source to view its data.</div>}
		>
			<>
				<header class="controls">
					<div class="title">{sources[dataTable.sourceKey].name ?? "CSV Data"}</div>
					<button type="button" class="control search">
						<SearchIcon />
					</button>
					<input
						type="search"
						class="control"
						id="data-table-search"
						onChange={() => {
							console.log("change");
						}}
					/>
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
								<For each={Object.keys(sources[dataTable.sourceKey].records?.[0] ?? {})}>
									{(col) => <th class={col.length > 40 ? "long" : ""}>{col}</th>}
								</For>
							</tr>
						</thead>
						<tbody>
							<For
								each={sources[dataTable.sourceKey].records.slice(
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
								sources[dataTable.sourceKey].records.length,
							)}{" "}
							of {sources[dataTable.sourceKey].records.length}
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
		</Show>
	);
};
