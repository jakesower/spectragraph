import { Router } from "@solidjs/router";
import { render } from "solid-js/web";
import { DataPrism } from "./ui/data-prism.jsx";
import { SectionProvider } from "./contexts/section-context.jsx";
import { SourceProvider } from "./contexts/source-context.jsx";
import { DataTableProvider } from "./contexts/data-table-context.jsx";

if (import.meta.hot) {
	import.meta.hot.on("vite:beforeUpdate", () => console.clear());
}

render(
	() => (
		<Router>
			<SectionProvider>
				<SourceProvider>
					<DataTableProvider>
						<div class="app">
							<DataPrism />
						</div>
					</DataTableProvider>
				</SourceProvider>
			</SectionProvider>
		</Router>
	),
	document.body as HTMLElement,
);
