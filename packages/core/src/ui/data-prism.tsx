import { Component } from "solid-js";
import { Route, Routes } from "@solidjs/router";
import { Import } from "./import/import.jsx";
import { SourceProvider } from "../contexts/source-context.jsx";
import { Remix } from "./remix/remix.jsx";
import { Accordion, AccordionItem } from "./shared/accordion.jsx";
import "./reset.css";
import "./variables.scss";
import "./data-prism.scss";

export const DataPrism: Component = () => {
	return (
		<SourceProvider>
			<div class="root">
				<aside>
					<header>
						<h1 class="title">Data Prism</h1>
					</header>
					<Accordion>
						<AccordionItem id="import" label="Import" class="import-section-theme">
							<div class="import-section-theme">Import Body</div>
						</AccordionItem>
						<AccordionItem id="remix" label="Remix" class="remix-section-theme">
							<div class="remix-aside">Remix Aside</div>
						</AccordionItem>
						<AccordionItem id="chart" label="Chart" class="chart-section-theme">
							<div class="chart-aside">Chart</div>
						</AccordionItem>
						<AccordionItem id="share" label="Share" class="share-section-theme">
							<div class="share-aside">Sharing</div>
						</AccordionItem>
						{/* <AccordionItem label={<A href="/remix">Remix</A>}>There</AccordionItem> */}
						{/* <h1>Annotate</h1> */}
						{/* <A href="/remix">Remix</A> */}
						{/* <h1>Chart</h1> */}
						{/* <h1>Share</h1> */}
						{/* <h1>Help</h1> */}
					</Accordion>
				</aside>
				<Routes>
					<Route path="/import" component={Import} />
					<Route path="/remix" component={Remix} />
					<Route path="**" element={<Import />} />
				</Routes>
			</div>
		</SourceProvider>
	);
};
