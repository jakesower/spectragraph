import { Component } from "solid-js";
import { useSources } from "../../../contexts/source-context";
import "./learn.scss";

export const Learn: Component = () => {
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
		</>
	);
};
