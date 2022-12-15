import { Route, Router } from "@solidjs/router";
import { customElement } from "solid-element";
import { createSignal } from "solid-js";
import { Import } from "./ui/import/import.jsx";
import { Navigation } from "./ui/navigation.jsx";

const [sources, setSources] = createSignal({});

customElement("data-prism", {}, (props) => {
	return (
		<div class="root">
			<Navigation />
			<Router>
				<Route
					path="/imports"
					element={<Import sources={sources} setSources={setSources} />}
				/>
				<Route path="*" element={<Import sources={sources} setSources={setSources} />} />
			</Router>
		</div>
	);
});
