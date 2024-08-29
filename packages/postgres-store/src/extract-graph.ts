import { mapValues, snakeCase } from "lodash-es";
import { flatMapQuery } from "./helpers/query-helpers.js";

export function extractGraph(rawResults, selectClause, context) {
	const { config, schema, query: rootQuery } = context;

	const graph = mapValues(schema.resources, () => ({}));
	const rootTable = config.resources[rootQuery.type].table;

	const extractors = flatMapQuery(schema, rootQuery, (_, info) => {
		const { parent, parentQuery, parentRelationship, attributes, type } = info;
		const resConfig = schema.resources[type];
		const { idAttribute = "id" } = resConfig;

		const selectAttributeMap = {};
		selectClause.forEach((attr, idx) => {
			selectAttributeMap[attr] = idx;
		});

		const parentType = (parent as any)?.type;
		const parentRelDef =
			parentQuery &&
			schema.resources[parentType].relationships[parentRelationship];

		const pathStr = info.path.length > 0 ? `$${info.path.join("$")}` : "";
		const idPath = `${rootTable}${pathStr}.${snakeCase(idAttribute)}`;
		const idIdx = selectAttributeMap[idPath];

		return (result) => {
			const id = result[idIdx];

			if (parentQuery) {
				const parentResSchema = schema.resources[parentType];
				const parentPathStr =
					info.path.length > 1 ? `$${info.path.slice(0, -1).join("$")}` : "";
				const parentIdAttribute = parentResSchema.idAttribute ?? "id";
				const parentIdPath = `${rootTable}${parentPathStr}.${snakeCase(
					parentIdAttribute,
				)}`;
				const parentIdIdx = selectAttributeMap[parentIdPath];
				const parentId = result[parentIdIdx];

				if (!graph[parentType][parentId]) {
					graph[parentType][parentId] = {
						[idAttribute]: parentId,
						id: parentId,
						type: parentType,
					};
				}
				const parent = graph[parentType][parentId];

				if (parentRelDef.cardinality === "one") {
					parent.relationships[parentRelationship] = id ? { id, type } : null;
				} else {
					parent.relationships[parentRelationship] =
						parent.relationships[parentRelationship] ?? [];

					if (
						!parent.relationships[parentRelationship].some((r) => r.id === id)
					) {
						parent.relationships[parentRelationship].push({ type, id });
					}
				}
			}

			if (!id) return;

			graph[type][id] = graph[type][id] ?? {
				id,
				type,
				attributes: {},
				relationships: {},
			};

			if (attributes.length > 0) {
				attributes.forEach((attr) => {
					const fullAttrPath = `${rootTable}${pathStr}.${snakeCase(attr)}`;
					const resultIdx = selectAttributeMap[fullAttrPath];

					graph[type][id].attributes[attr] = result[resultIdx];
				});
			} else {
				graph[type][id].id = id;
				graph[type][id].type = type;
			}
		};
	});

	rawResults.forEach((row) =>
		extractors.forEach((extractor) => extractor(row)),
	);

	return graph;
}
