import { parse } from "csv-parse/browser/esm";

export function CsvImporter(props) {
	const { onChange } = props;

	const readFile = (ev) => {
		const file = (ev.target.files || [])[0];
		// var fileName = file.name.replace(/\.csv$/, "").replace(/_/g, " ");

		const r = new FileReader();
		r.onload = function () {
			parse(this.result, { columns: true }, (err, data) => {
				onChange(data);
			});
		};

		r.readAsText(file);
	};

	return (
		<div class="csv-source">
			<input type="file" onChange={readFile} />
		</div>
	);
}
