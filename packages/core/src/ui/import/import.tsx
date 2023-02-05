import { Component, For } from "solid-js";
import { useSources } from "../../contexts/source-context.js";
import { DataTable } from "../shared/data-table.js";
import { CsvImporter } from "./csv-importer.js";
import "./import.scss";

export const Import: Component = () => {
	const [sources, setSources] = useSources();

	return (
		<main class="import">
			{/* <section class="sidebar">
				<div class="sources-container">
					<For each={Object.entries(sources)}>
						{([sourceName, source]) => (
							<div class="source-list-item">
								<h2 class="source-name">{sourceName}</h2>
								<div class="row-count">{source.records.length} records</div>
								<div class="columns">
									<For each={Object.entries(source.columns ?? {})}>
										{([colName, colData]) => {
											const { description, title, types } = colData;
											return (
												<div class="column">
													<h3 class="column-name">{colName}</h3>
													<div class="title">{title}</div>
													<div class="description">{description}</div>
													<ul>
														<For each={colData.types}>{(type) => <li>{type}</li>}</For>
													</ul>
												</div>
											);
										}}
									</For>
								</div>
							</div>
						)}
					</For>
				</div>
				<CsvImporter
					onChange={(source) => {
						setSources({ csv: source });
					}}
				/>
			</section> */}
			<section class="data-table">
				<DataTable />
			</section>
		</main>
	);
};
