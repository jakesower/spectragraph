import { parse } from "csv-parse/browser/esm";
import { Component, JSX, splitProps } from "solid-js";
import { detectColumns, Source } from "../../data/source";

type Props = Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
	onChange: (source: Source) => void;
};

function inferSource(csvData: { [k: string]: string }[]): Source {
	const columns = detectColumns(csvData);

	return { records: csvData, columns };
}

export const CsvImporter: Component<Props> = (props) => {
	const [local, rest] = splitProps(props, ["onChange"]);

	const readFile = (ev) => {
		const file = (ev.target.files || [])[0];

		const r = new FileReader();
		r.onload = function () {
			if (this.result) {
				parse(this.result as Buffer, { columns: true }, (err, data) => {
					const inferredSource = inferSource(data);
					local.onChange(inferredSource);
				});
			}
		};

		r.readAsText(file);
	};

	return (
		<div {...rest} class={`csv-source ${rest.class}`.trim()}>
			<div class="form-row">
				<label for="import-csv-file-name">Source Name</label>
				<input type="text" id="import-csv-file-name" />
			</div>
			<div class="form-row">
				<label for="import-csv">CSV</label>
				<input type="file" accept=".csv" id="import-csv" onChange={readFile} />
			</div>
		</div>
	);
};
