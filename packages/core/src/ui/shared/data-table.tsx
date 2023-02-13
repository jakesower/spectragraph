import { Component, createSignal, For, JSX, splitProps } from "solid-js";
import { Source } from "../../data/source.js";
import { Portal } from "solid-js/web";
import ActionsIcon from "../../icons/settings-gear-icon.svg";
import FilterIcon from "../../icons/filter-line-icon.svg";
import SearchIcon from "../../icons/search-icon.svg";
import "./data-table.scss";

const perPage = 100;

type DataTableProps = JSX.InputHTMLAttributes<HTMLDivElement> & {
	source: Source;
};
export const DataTable: Component<DataTableProps> = (props) => {
	const [local, rest] = splitProps(props, ["class", "source"]);
	const [page, setPage] = createSignal(1);

	const totalPages = Math.ceil(local.source.records.length / perPage);

	return (
		<Portal mount={document.getElementById("data-table")}>
			<div {...rest} class={`data-table-container ${local.class}`.trim()}>
				<header class="controls">
					<div class="title">{local.source.title ?? "CSV Data"}</div>
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
					<table class="data-table">
						<thead>
							<tr>
								<For each={Object.keys(local.source.records?.[0] ?? {})}>
									{(col) => <th class={col.length > 40 ? "long" : ""}>{col}</th>}
								</For>
							</tr>
						</thead>
						<tbody>
							<For
								each={local.source.records.slice(
									(page() - 1) * perPage,
									page() * perPage,
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
						{(page() - 1) * perPage + 1} - {page() * perPage} of{" "}
						{local.source.records.length}{" "}
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
				</footer>
			</div>
		</Portal>
	);
};
