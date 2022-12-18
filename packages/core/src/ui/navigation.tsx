import { A } from "@solidjs/router";
import { Component } from "solid-js";

export const Navigation: Component = () => {
	return (
		<nav class="navigation">
			<h1>Data Prism</h1>
			<A href="/import" class="import">
				Import
			</A>
			<A href="/remix" class="remix">
				Remix
			</A>
			<A href="/chart" class="chart">
				Chart
			</A>
		</nav>
	);
};
