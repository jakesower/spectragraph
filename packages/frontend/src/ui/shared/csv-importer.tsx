import { parse } from "csv-parse/browser/esm";
import { Component, For, JSX, createSignal, splitProps } from "solid-js";
import { detectColumns, Source, Table } from "../../data/source";
import { uniq } from "lodash-es";
import "./csv-importer.scss";
import "../standards.scss";

type Props = Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
	onChange: (source: { name: string; table: Table }) => void;
};

function inferSource(csvData: { [k: string]: string }[]): Table {
	return { rows: csvData, columns: detectColumns(csvData) };
}

export const CsvImporter: Component<Props> = (props) => {
	const [local, rest] = splitProps(props, ["onChange"]);
	const [csvData, setCsvData] = createSignal<Table>(null);
	const [name, setName] = createSignal<string>("");

	const readFile = (ev) => {
		const file = (ev.target.files || [])[0];

		const r = new FileReader();
		r.onload = function () {
			if (this.result) {
				parse(this.result as Buffer, { columns: true }, (err, data) => {
					const inferredSource = inferSource(data);
					// local.onChange(inferredSource);
					setCsvData(inferredSource);
				});
			}
		};

		r.readAsText(file);
	};

	const handleSubmit = () => {
		local.onChange({
			name: name(),
			table: csvData(),
		});
	};

	return (
		<div {...rest} class={`csv-importer ${rest.class ?? ""}`.trim()}>
			<form class="standard">
				<section class="upload-stage">
					<div class="form-row">
						<label for="import-csv">CSV</label>
						<input type="file" accept=".csv" id="import-csv" onChange={readFile} />
					</div>
				</section>
				{csvData() && (
					<>
						<section class="finalize-stage">
							<div class="form-row">
								<label for="import-csv-file-name">Source Name</label>
								<input
									type="text"
									id="import-csv-file-name"
									value={name()}
									onInput={(e) => {
										setName((e.target as any).value); // wtf does it need any
									}}
								/>
							</div>
						</section>

						<section class="submit-section">
							<button type="button" onClick={handleSubmit}>
								Import CSV Source
							</button>
						</section>

						<div class="preview">
							<h2>Automatically Detected Information</h2>
							<table class="columns standard">
								<thead>
									<tr>
										<th>Column</th>
										<th>Type</th>
										<th class="number">Unique Values</th>
									</tr>
								</thead>
								<tbody>
									<For each={Object.entries(csvData().columns)}>
										{([colName, colDef]) => (
											<tr>
												<td>{colName}</td>
												<td>{colDef.type}</td>
												<td class="number">{uniq(colDef.values).length}</td>
											</tr>
										)}
									</For>
								</tbody>
							</table>
						</div>
					</>
				)}
			</form>
		</div>
	);
};
