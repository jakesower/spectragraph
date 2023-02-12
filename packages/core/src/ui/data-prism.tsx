import { Component, createSignal } from "solid-js";
import { Explore } from "./sections/explore/explore.jsx";
import { Remix } from "./sections/remix/remix.jsx";
import { Accordion, AccordionItem } from "./shared/accordion.jsx";
import { Chart } from "./sections/chart/chart.jsx";
import { Share } from "./sections/share/share.jsx";
import { Annotate } from "./sections/annotate/annotate.jsx";
import { Learn } from "./sections/learn/learn.jsx";
import "./reset.css";
import "./variables.scss";
import "./data-prism.scss";

export const DataPrism: Component = () => {
	const [section, setSection] = createSignal("explore");

	return (
		<aside>
			<Accordion selected={section} setSelected={setSection}>
				<AccordionItem id="explore" label="Explore" class="explore-section">
					<Explore />
				</AccordionItem>
				<AccordionItem id="remix" label="Remix" class="remix-section">
					<Remix />
				</AccordionItem>
				<AccordionItem id="chart" label="Chart" class="chart-section">
					<Chart />
				</AccordionItem>
				<AccordionItem id="share" label="Share" class="share-section">
					<Share />
				</AccordionItem>
				<AccordionItem id="annotate" label="Annotate" class="annotate-section">
					<Annotate />
				</AccordionItem>
				<AccordionItem id="learn" label="Learn" class="learn-section">
					<Learn />
				</AccordionItem>
			</Accordion>
		</aside>
	);
};
