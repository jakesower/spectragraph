import { Component, For } from "solid-js";
import { useSources } from "../../../contexts/source-context.js";
import { ImportSource } from "../../shared/import-source.jsx";
import "./explore.scss";
import "../../standards.scss";
import { useDataTable } from "../../../contexts/data-table-context.jsx";

export const Explore: Component = () => {
	const [sources] = useSources();
	const [dataTableState, setDataTableState] = useDataTable();

	return (
		<div class="explore-section">
			<section class="sources">
				<ul class="standard sources-container">
					<For each={Object.entries(sources)}>
						{([sourceKey, source]) => (
							<button
								class={`source-list-item unadorned${
									dataTableState?.sourceKey === sourceKey ? " selected" : ""
								}`}
								role="listitem"
								onClick={() => {
									setDataTableState({ sourceKey });
								}}
							>
								<h2
									class={`source-name${
										dataTableState?.sourceKey === sourceKey ? " selected" : ""
									}`}
								>
									{sourceKey}
								</h2>
								<div class="column-count">
									{Object.keys(source.table.rows[0]).length ?? "??"} columns
								</div>
								<div class="row-count">{source.table.rows.length} records</div>
							</button>
						)}
					</For>
				</ul>
			</section>
			<ImportSource />
		</div>
	);
};
