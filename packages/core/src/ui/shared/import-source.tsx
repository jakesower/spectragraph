import { Component } from "solid-js";
import { CsvImporter } from "./csv-importer";
import { useSources } from "../../contexts/source-context";
import { Tab, Tabs } from "./tabs";

export const ImportSource: Component = () => {
	const [, setSources] = useSources();

	return (
		<section class="standard import-source">
			<h1>Import Source</h1>
			<form class="standard import-source-form">
				<Tabs>
					<Tab label="CSV">
						<CsvImporter
							id="import-csv"
							onChange={(source) => {
								setSources({ csv: source });
							}}
						/>
					</Tab>
					<Tab label="URL">
						<div class="form-row">
							<label>URL/IRI</label>
							<input id="import-url" type="text" />
						</div>
					</Tab>
				</Tabs>
			</form>
		</section>
	);
};
