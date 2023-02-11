import { Component, createSignal } from "solid-js";
import { Route, Routes } from "@solidjs/router";
import { Import } from "./import/import.jsx";
import { Remix } from "./remix/remix.jsx";
import { Accordion, AccordionItem } from "./shared/accordion.jsx";
import "./reset.css";
import "./variables.scss";
import "./data-prism.scss";
import { useSection } from "../contexts/section-context.jsx";

export const DataPrism: Component = () => {
	const [section, setSection] = createSignal("import");

	return (
		<aside>
			<Accordion selected={section} setSelected={setSection}>
				<AccordionItem id="import" label="Import" class="import-section-theme">
					<div class="section-controls">
						<Import />
					</div>
				</AccordionItem>
				<AccordionItem id="remix" label="Remix" class="remix-section-theme">
					<div class="section-controls">Remix Aside</div>
				</AccordionItem>
				<AccordionItem id="chart" label="Chart" class="chart-section-theme">
					<div class="section-controls">Chart</div>
				</AccordionItem>
				<AccordionItem id="share" label="Share" class="share-section-theme">
					<div class="section-controls">Share</div>
				</AccordionItem>
				<AccordionItem id="annotate" label="Annotate" class="annotate-section-theme">
					<div class="section-controls">Annotate</div>
				</AccordionItem>
				<AccordionItem id="learn" label="Learn" class="learn-section-theme">
					<div class="section-controls">Learnx</div>
				</AccordionItem>
			</Accordion>
		</aside>
	);
};
