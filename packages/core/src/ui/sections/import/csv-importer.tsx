import { parse } from "csv-parse/browser/esm";
import { Component } from "solid-js";
import { detectColumns, Source } from "../../../data/source";

type Props = {
	onChange: (source: Source) => void;
};

function inferSource(csvData: { [k: string]: string }[]): Source {
	const columns = detectColumns(csvData);

	return { records: csvData, columns };
}

export const CsvImporter: Component<Props> = (props) => {
	const { onChange } = props;

	const readFile = (ev) => {
		const file = (ev.target.files || [])[0];

		const r = new FileReader();
		r.onload = function () {
			if (this.result) {
				parse(this.result as Buffer, { columns: true }, (err, data) => {
					const inferredSource = inferSource(data);
					onChange(inferredSource);
				});
			}
		};

		r.readAsText(file);
	};

	return (
		<div class="csv-source">
			<input type="file" accept=".csv" onChange={readFile} />
		</div>
	);
};
