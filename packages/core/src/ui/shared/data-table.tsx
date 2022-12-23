import { Component, createSignal, For } from "solid-js";
import { useSources } from "../../contexts/source-context.js";
import "./data-table.scss";

const perPage = 30;

export const DataTable: Component = () => {
	const [sources] = useSources();
	const [page, setPage] = createSignal(1);

	if (!sources.csv) return null;

	const totalPages = Math.ceil(sources.csv.records.length / perPage);

	return (
		<>
			<div class="controls">
				<button class="control sources" type="button">
					Sources
				</button>
				<div class="control splitter" />
				<div class="control search">
					<label for="data-table-search">Search:</label>{" "}
					<input type="search" id="data-table-search" class="data-table-search" />
				</div>
				<div class="control columns">Columns</div>
				<div class="control filter">Filters</div>
				<div class="control sort">Sorting</div>
				<div class="control page">Pages</div>
			</div>
			<div class="data-table-wrapper">
				<table class="data-table">
					<thead>
						<tr>
							<For each={Object.keys(sources.csv?.records?.[0] ?? {})}>
								{(col) => <th class={col.length > 40 ? "long" : ""}>{col}</th>}
							</For>
						</tr>
					</thead>
					<tbody>
						<For
							each={sources.csv.records.slice((page() - 1) * perPage, page() * perPage)}
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
			<div class="controls footer">
				<div class="page-nav">
					{(page() - 1) * perPage + 1} - {page() * perPage} of{" "}
					{sources.csv.records.length}{" "}
					<button
						type="button"
						disabled={page() === 1}
						onClick={() => setPage((prev) => Math.max(1, prev - 1))}
					>
						&lt;
					</button>
					<button
						type="button"
						disabled={page() === totalPages}
						onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
					>
						&gt;
					</button>
				</div>
			</div>
		</>
	);
};
