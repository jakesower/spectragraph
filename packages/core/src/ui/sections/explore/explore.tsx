import { Component, For } from "solid-js";
import { useSources } from "../../../contexts/source-context.js";
import { ImportSource } from "../../shared/import-source.jsx";
import "./explore.scss";
import "../../standards.scss";

export const Explore: Component = () => {
	const [sources] = useSources();
	console.log(sources);

	return (
		<div class="explore-section">
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
			<ImportSource />
		</div>
	);
};
