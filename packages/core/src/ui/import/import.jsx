import { useSources } from "../../contexts/source-context.jsx";
import { DataTable } from "../shared/data-table.jsx";
import { CsvImporter } from "./csv-importer.jsx";
import "./import.scss";

export function Import() {
	const [, setSources] = useSources();

	return (
		<main class="import">
			<section class="sidebar">
				<CsvImporter
					onChange={(data) => {
						setSources({ csv: data });
					}}
				/>
			</section>
			<section class="data-table">
				<DataTable />
			</section>
		</main>
	);
}
