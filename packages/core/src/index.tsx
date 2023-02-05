import { Router } from "@solidjs/router";
import { render } from "solid-js/web";
import { DataPrism } from "./ui/data-prism.jsx";

if (import.meta.hot) {
	import.meta.hot.on("vite:beforeUpdate", () => console.clear());
}

render(
	() => (
		<Router>
			<DataPrism />
		</Router>
	),
	document.body as HTMLElement,
);
