import { mapValues, snakeCase } from "es-toolkit";
import { flatMapQuery } from "@spectragraph/query-helpers";

/**
 * @typedef {Object} SelectClauseItem
 * @property {string} value - The select clause value
 */

/**
 * @typedef {Object} GraphExtractContext
 * @property {import('spectragraph').Schema} schema - The schema
 * @property {import('spectragraph').RootQuery} query - The root query
 * @property {Object} [columnTypeModifiers] - Optional column type modifiers for data extraction
 */

/**
 * @typedef {Object.<string, Object.<string, any>>} Graph
 */

// Path string utilities
const buildPathString = (path) => (path.length > 0 ? `$${path.join("$")}` : "");
const buildParentPath = (path) =>
	path.length > 1 ? `$${path.slice(0, -1).join("$")}` : "";

// Resource creation utilities
const findOrCreateResource = (context) => {
	const { graph, type, id, schema } = context;
	const resourceSchema = schema.resources[type];
	const { idAttribute = "id" } = resourceSchema;

	if (!graph[type][id]) {
		graph[type][id] = {
			[idAttribute]: id,
			id,
			type,
			attributes: {},
			relationships: {},
		};
	}
	return graph[type][id];
};

const processRelationship = (context) => {
	const { parent, relationshipName, relationshipDef, childType, childId } =
		context;

	if (relationshipDef.cardinality === "one") {
		parent.relationships[relationshipName] = childId
			? { id: childId, type: childType }
			: null;
	} else {
		parent.relationships[relationshipName] =
			parent.relationships[relationshipName] ?? [];

		if (!parent.relationships[relationshipName].some((r) => r.id === childId)) {
			if (childId !== null) {
				parent.relationships[relationshipName].push({
					type: childType,
					id: childId,
				});
			}
		}
	}
};

/**
 * Extracts a resource graph from raw SQL query results
 * @param {any[][]} rawResults - Raw SQL query results
 * @param {SelectClauseItem[]} selectClause - The select clause items
 * @param {GraphExtractContext} context - Extract context with schema and query
 * @returns {Graph} The extracted resource graph organized by type and ID
 */
export function extractGraph(rawResults, selectClause, context) {
	const { schema, query: rootQuery, columnTypeModifiers = {} } = context;
	const graph = mapValues(schema.resources, () => ({}));

	const extractors = flatMapQuery(schema, rootQuery, (_, info) => {
		const { parent, parentQuery, parentRelationship, attributes, type } = info;
		const resSchema = schema.resources[type];
		const { idAttribute = "id" } = resSchema;

		const selectAttributeMap = {};
		selectClause.forEach((attr, idx) => {
			selectAttributeMap[attr.value] = idx;
		});

		const parentType = parent?.type;
		const parentRelDef =
			parentQuery &&
			schema.resources[parentType].relationships[parentRelationship];

		const pathStr = buildPathString(info.path);
		const idPath = `${rootQuery.type}${pathStr}.${snakeCase(idAttribute)}`;
		const idIdx = selectAttributeMap[idPath];

		return (result) => {
			const id = result[idIdx];

			if (parentQuery) {
				const parentResSchema = schema.resources[parentType];
				const parentId =
					result[
						selectAttributeMap[
							`${rootQuery.type}${buildParentPath(info.path)}.${snakeCase(
								parentResSchema.idAttribute ?? "id",
							)}`
						]
					];

				const parent = findOrCreateResource({
					graph,
					type: parentType,
					id: parentId,
					schema,
				});

				processRelationship({
					parent,
					relationshipName: parentRelationship,
					relationshipDef: parentRelDef,
					childType: type,
					childId: id,
				});
			}

			if (!id) return;

			findOrCreateResource({
				graph,
				type,
				id,
				schema,
			});

			if (attributes.length > 0) {
				attributes.forEach((attr) => {
					const resultIdx =
						selectAttributeMap[
							`${rootQuery.type}${pathStr}.${snakeCase(attr)}`
						];
					const resourceSchema = schema.resources[type];
					const attrType = resourceSchema.attributes[attr]?.type;

					graph[type][id].attributes[attr] = columnTypeModifiers[attrType]
						? columnTypeModifiers[attrType].extract(result[resultIdx])
						: result[resultIdx];
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
