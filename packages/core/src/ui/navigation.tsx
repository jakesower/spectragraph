import { A } from "@solidjs/router";
import { Component } from "solid-js";

export const Navigation: Component = () => {
	return (
		<nav class="navigation">
			<section class="title">Data Prism</section>
			<section class="controls left">
				<button class="control sources" type="button">
					Sources
				</button>
			</section>
			<section class="controls right">
				<button class="control sources" type="button">
					Columns
				</button>
				<button class="control sources" type="button">
					Filters
				</button>
				<button class="control sources" type="button">
					Sorting
				</button>
				<button class="control sources" type="button">
					Pages
				</button>
			</section>
		</nav>
	);
};
