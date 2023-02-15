import { Component, createSignal } from "solid-js";
import { CsvImporter } from "./csv-importer";
import { useSources } from "../../contexts/source-context";
import { Tab, Tabs } from "./tabs";
import { Modal } from "./modal";

export const ImportSource: Component = () => {
	const [, setSources] = useSources();
	const [importing, setImporting] = createSignal(false);

	return (
		<>
			{importing() && (
				<Modal
					title="Import New Source"
					onClose={() => setImporting(false)}
					class="explore-section"
				>
					<Tabs>
						<Tab label="CSV">
							<CsvImporter
								id="import-csv"
								onChange={({ name, data }) => {
									setSources({ [name]: data });
									setImporting(false);
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
				</Modal>
			)}
			<section class="standard import-source">
				<h1>Import Source</h1>
				<button
					type="button"
					onClick={() => {
						setImporting(true);
					}}
				>
					+ Add Source
				</button>
			</section>
		</>
	);
};
