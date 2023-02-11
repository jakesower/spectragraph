import { Component, createSignal } from "solid-js";
import { Route, Routes } from "@solidjs/router";
import { Import } from "./sections/import/import.jsx";
import { Remix } from "./sections/remix/remix.jsx";
import { Accordion, AccordionItem } from "./shared/accordion.jsx";
import "./reset.css";
import "./variables.scss";
import "./data-prism.scss";
import { Chart } from "./sections/chart/chart.jsx";
import { Share } from "./sections/share/share.jsx";
import { Annotate } from "./sections/annotate/annotate.jsx";
import { Learn } from "./sections/learn/learn.jsx";

export const DataPrism: Component = () => {
	const [section, setSection] = createSignal("remix");

	return (
		<aside>
			<Accordion selected={section} setSelected={setSection}>
				<AccordionItem id="import" label="Import" class="import-section-theme">
					Hello
					<Import />
				</AccordionItem>
				<AccordionItem id="remix" label="Remix" class="remix-section-theme">
					<Remix />
				</AccordionItem>
				<AccordionItem id="chart" label="Chart" class="chart-section-theme">
					<Chart />
				</AccordionItem>
				<AccordionItem id="share" label="Share" class="share-section-theme">
					<Share />
				</AccordionItem>
				<AccordionItem id="annotate" label="Annotate" class="annotate-section-theme">
					<Annotate />
				</AccordionItem>
				<AccordionItem id="learn" label="Learn" class="learn-section-theme">
					<Learn />
				</AccordionItem>
			</Accordion>
		</aside>
	);
};
