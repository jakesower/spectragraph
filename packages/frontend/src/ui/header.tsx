import { A } from "@solidjs/router";
import { Component } from "solid-js";
import { SourceIcon } from "../icons/source-icon";

export const Header: Component = () => {
	return (
		<header>
			<section class="title-container">
				<h1 class="title">Data Prism</h1>
			</section>
			<section class="controls left">
				<button class="current-source">
					<SourceIcon />
					CSV
				</button>
			</section>
			<section class="controls right">
				<button class="control sources" type="button">
					Filter
				</button>
				<button class="control sources" type="button">
					Sort
				</button>
			</section>
		</header>
	);
};
