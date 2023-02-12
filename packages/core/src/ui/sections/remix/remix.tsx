import { Component } from "solid-js";
import { DataTable } from "../../shared/data-table";
import { useSources } from "../../../contexts/source-context";
import "./remix.scss";

export const Remix: Component = () => {
	const [sources, setSources] = useSources();

	return (
		<>
			<div class="subsection">
				<h2>Source</h2>
			</div>
			<div class="subsection">
				<h2>Source</h2>
			</div>
			<div class="subsection">
				<h2>Source</h2>
			</div>
			<div class="subsection">
				<h2>Source</h2>
			</div>
			<div class="subsection">
				<h2>Source</h2>
			</div>
			<div class="subsection">
				<h2>Source</h2>
			</div>
			<div class="subsection">
				<h2>Source</h2>
			</div>
			<div class="subsection">
				<h2>Source</h2>
			</div>
			<div class="subsection">
				<h2>Source</h2>
			</div>
			<DataTable source={sources.csv} class="remix-section" />
		</>
	);
};
