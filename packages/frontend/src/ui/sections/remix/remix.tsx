import { Component, For, createSignal } from "solid-js";
import { useSources } from "../../../contexts/source-context";
import { RemixOperation, useDataTable } from "../../../contexts/data-table-context";
import "./remix.scss";
import { ImportSource } from "../../shared/import-source";
import { createMemoryStore } from "solid-js/store";

const initOperation: RemixOperation = {
	type: "derivative",
	function: "math",
	arguments: "",
};

export const Remix: Component = () => {
	const [sources] = useSources();
	const [dataTable, setDataTable] = useDataTable();
	const [currentOperation, setCurrentOperation] =
		createMemoryStore<RemixOperation>(initOperation);

	return (
		<>
			<section class="source standard">
				<h2>Source</h2>
				<select
					value={dataTable.sourceKey}
					onChange={(e) => {
						setDataTable({ sourceKey: e.currentTarget.value });
					}}
				>
					<For each={Object.entries(sources)}>
						{([sourceKey, { name }]) => (
							<option value={sourceKey}>{name ?? sourceKey}</option>
						)}
					</For>
				</select>
				<ImportSource class="remix-section" />
			</section>
			<For each={dataTable.remixOperations}>
				{(op, idx) => (
					<>
						<section class="remix-operation">
							<header>
								<h2>{op.type}</h2>{" "}
								<button
									class="remove unadorned"
									onClick={() => {
										setDataTable({
											remixOperations: dataTable.remixOperations.filter(
												(_, i) => idx() !== i,
											),
										});
									}}
								>
									✕
								</button>
							</header>
							<div>{op.function}</div>
							<div>{op.arguments}</div>
						</section>
						{/* <div class="viewpoint" /> */}
					</>
				)}
			</For>
			<section>
				<h2>New Operation</h2>
				<form class="standard">
					<div class="form-row">
						<label for="new-operation-function">Operation</label>
						<select
							id="new-operation-function"
							value={currentOperation.function}
							onChange={(e) => setCurrentOperation({ function: e.currentTarget.value })}
						>
							<option value="mathjs">MathJS Expression</option>
						</select>
					</div>
					<div class="form-row">
						<input
							type="text"
							value={currentOperation.arguments}
							onChange={(e) => setCurrentOperation({ arguments: e.currentTarget.value })}
							required
						/>
					</div>
					<div class="form-row submit-row">
						<button
							type="submit"
							onClick={(e) => {
								e.preventDefault();
								setDataTable({
									remixOperations: [...dataTable.remixOperations, currentOperation],
								});
								setCurrentOperation(initOperation);
							}}
						>
							Finish
						</button>
					</div>
				</form>
			</section>
		</>
	);
};
