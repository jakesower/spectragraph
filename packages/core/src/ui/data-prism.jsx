import { Navigation } from "./navigation.jsx";
import { Route, Routes } from "@solidjs/router";
import { Import } from "./import/import.jsx";
import { SourceProvider } from "../contexts/source-context.jsx";
import "./variables.scss";
import "./data-prism.scss";
import { Remix } from "./remix/remix.jsx";

export function DataPrism() {
	return (
		<SourceProvider>
			<div class="root">
				<Navigation />
				<Routes>
					<Route path="/imports" element={<Import />} />
					<Route path="/remix" element={<Remix />} />
					<Route path="*" element={<Import />} />
				</Routes>
			</div>
		</SourceProvider>
	);
}
