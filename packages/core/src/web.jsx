import { Router } from "@solidjs/router";
import { render } from "solid-js/web";
import { DataPrism } from "./ui/data-prism.jsx";

render(
	() => (
		<Router>
			<DataPrism />
		</Router>
	),
	document.body,
);
