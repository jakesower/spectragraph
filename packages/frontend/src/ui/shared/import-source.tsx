import { Component, JSX, createSignal } from "solid-js";
import { CsvImporter } from "./csv-importer";
import { useSources } from "../../contexts/source-context";
import { Tab, Tabs } from "./tabs";
import { Modal } from "./modal";

type Props = JSX.InputHTMLAttributes<HTMLDivElement>;

export const ImportSource: Component<Props> = (props) => {
	const [, setSources] = useSources();
	const [importing, setImporting] = createSignal(false);

	return (
		<>
			{importing() && (
				<Modal title="Import New Source" onClose={() => setImporting(false)} {...props}>
					<Tabs>
						<Tab label="CSV">
							<CsvImporter
								id="import-csv"
								onChange={({ name, table }) => {
									setSources({ [name]: { table, name } });
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
			<div class="import-source">
				<button
					type="button"
					onClick={() => {
						setImporting(true);
					}}
				>
					+ Add Source
				</button>
			</div>
		</>
	);
};
