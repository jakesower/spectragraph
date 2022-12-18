import { Component, For } from "solid-js";
import { useSources } from "../../contexts/source-context.js";
import { DataTable } from "../shared/data-table.js";
import { CsvImporter } from "./csv-importer.js";
import "./import.scss";

export const Import: Component = () => {
	const [sources, setSources] = useSources();

	return (
		<main class="import">
			<section class="sidebar">
				<div class="sources-container">
					<For each={Object.entries(sources)}>
						{([sourceName, source]) => (
							<div class="source-list-item">
								<h2 class="source-name">{sourceName}</h2>
								<div class="row-count">{source.data.length} records</div>
								<div class="columns">
									<For each={Object.keys(source[0] ?? {})}>
										{(k) => <div class="column">{k}</div>}
									</For>
								</div>
							</div>
						)}
					</For>
				</div>
				<CsvImporter
					onChange={(data) => {
						setSources({ csv: { data } });
					}}
				/>
			</section>
			<section class="data-table">
				<DataTable />
			</section>
		</main>
	);
};
