import { A } from "@solidjs/router";

export function Navigation() {
	return (
		<nav class="navigation">
			<h1>Data Prism</h1>
			<A href="/import" class="import">Import</A>
			<A href="/remix" class="remix">Remix</A>
			<A href="/chart" class="chart">Chart</A>
		</nav>
	);
}
