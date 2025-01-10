import { mapValues } from "lodash-es";
import { Schema } from "./schema.js";
import { applyOrMap } from "@data-prism/utils";
export { createQueryGraph, queryGraph } from "./graph/query-graph.js";

export type Ref = {
	type: string;
	id: string;
};

export type NormalResource = {
	id: string;
	type: string;
	attributes: { [k: string]: unknown };
	relationships: { [k: string]: Ref | Ref[] | null };
};

export type Graph = {
	[k: string]: {
		[k: string]: NormalResource;
	};
};

export function createEmptyGraph(schema: Schema): Graph {
	return mapValues(schema.resources, () => ({}));
}

export function emptyGraph(schema: Schema): Graph {
	console.warn("`emptyGraph` is deprecated in favor of `createEmptyGraphh`");
	return createEmptyGraph(schema);
}

export function linkInverses(graph: Graph, schema: Schema): Graph {
	const output = structuredClone(graph);

	Object.entries(schema.resources).forEach(([resType, resSchema]) => {
		const sampleRes = Object.values(graph[resType])[0];
		if (!sampleRes) return;

		Object.entries(resSchema.relationships).forEach(([relName, relSchema]) => {
			const { cardinality, type: foreignType, inverse } = relSchema;

			if (sampleRes.relationships[relName] !== undefined || !inverse) return;

			if (cardinality === "one") {
				const map = {};
				Object.entries(graph[foreignType]).forEach(
					([foreignId, foreignRes]) => {
						applyOrMap(foreignRes.relationships[inverse], (foreignRef) => {
							map[foreignRef.id] = foreignId;
						});
					},
				);

				Object.entries(output[resType]).forEach(([localId, localRes]) => {
					localRes.relationships[relName] = map[localId]
						? { type: foreignType, id: map[localId] }
						: null;
				});
			} else if (cardinality === "many") {
				const map = {};
				Object.entries(graph[foreignType]).forEach(
					([foreignId, foreignRes]) => {
						applyOrMap(foreignRes.relationships[inverse], (foreignRef) => {
							if (!map[foreignRef.id]) map[foreignRef.id] = [];
							map[foreignRef.id].push(foreignId);
						});
					},
				);

				Object.entries(output[resType]).forEach(([localId, localRes]) => {
					localRes.relationships[relName] = map[localId]
						? map[localId].map((id) => ({ type: foreignType, id }))
						: [];
				});
			}
		});
	});

	return output;
}

export function mergeGraphs(left: Graph, right: Graph): Graph {
	const output = structuredClone(left);
	Object.entries(right).forEach(([resourceType, resources]) => {
		output[resourceType] = { ...resources, ...(left[resourceType] ?? {}) };
	});

	return output;
}
