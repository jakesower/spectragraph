import { Component } from "solid-js";
import { Navigation } from "./navigation.jsx";
import { Route, Routes } from "@solidjs/router";
import { Import } from "./import/import.jsx";
import { SourceProvider } from "../contexts/source-context.jsx";
import { Remix } from "./remix/remix.jsx";
import "./variables.scss";
import "./data-prism.scss";

export const DataPrism: Component = () => {
	return (
		<SourceProvider>
			<div class="root">
				<Navigation />
				<Routes>
					<Route path="/import" component={Import} />
					<Route path="/remix" component={Remix} />
					<Route path="**" element={<Import />} />
				</Routes>
			</div>
		</SourceProvider>
	);
};
