import { Component, For } from "solid-js";
import { useSources } from "../../../contexts/source-context.js";
import { DataTable } from "../../shared/data-table.js";
import { CsvImporter } from "../../shared/csv-importer.js";
import "./explore.scss";
import "../../shared.scss";
import { ImportSource } from "../../shared/import-source.jsx";

export const Explore: Component = () => {
	const [sources, setSources] = useSources();

	return (
		<div class="explore-section">
			<ImportSource />
			<section class="sources">
				<ul class="standard sources-container">
					<For each={Object.entries(sources)}>
						{([sourceName, source]) => (
							<li class="source-list-item">
								<h2 class="source-name">{sourceName}</h2>
								<div class="column-count">
									{Object.keys(source.records[0]).length ?? "??"} columns
								</div>
								<div class="row-count">{source.records.length} records</div>
							</li>
						)}
					</For>
				</ul>
			</section>
			<DataTable source={sources.csv} class="explore-section" />
		</div>
	);
};
