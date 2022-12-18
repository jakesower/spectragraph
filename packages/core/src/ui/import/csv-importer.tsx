import { parse } from "csv-parse/browser/esm";
import { Component } from "solid-js";
import { Record } from "../../contexts/source-context";

type Props = {
	onChange: (rawRecords: Record[]) => void;
};

export const CsvImporter: Component<Props> = (props) => {
	const { onChange } = props;

	const readFile = (ev) => {
		const file = (ev.target.files || [])[0];
		// var fileName = file.name.replace(/\.csv$/, "").replace(/_/g, " ");

		const r = new FileReader();
		r.onload = function () {
			if (this.result) {
				parse(this.result as Buffer, { columns: true }, (err, data) => {
					onChange(data);
				});
			}
		};

		r.readAsText(file);
	};

	return (
		<div class="csv-source">
			<input type="file" onChange={readFile} />
		</div>
	);
};
