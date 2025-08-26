import { mapValues, omit } from "lodash-es";
import { normalizeQuery, queryGraph } from "@data-prism/core";
import { buildSql, composeClauses } from "./helpers/sql.js";
import { runQuery } from "./operations/operations.js";
import { flattenQuery } from "./helpers/query-helpers.js";
import { castValToDb } from "./helpers/sql.js";
import { varsExpressionEngine } from "./helpers/sql-expressions.js";

/**
 *
 * @param {import('@data-prism/core').Query} query
 * @param {import('./sqlite-store.js').Context} context
 * @returns
 */
export function get(query, context) {
	const { schema, config, rootClauses = [] } = context;
	const { db, resources } = config;

	const normalQuery = normalizeQuery(schema, query);

	const resConfig = resources[normalQuery.type];
	const rootTable = resConfig.table;

	const initModifiers = {
		from: rootTable,
	};

	return runQuery(normalQuery, context, (queryModifiers) => {
		const composedModifiers = composeClauses([
			initModifiers,
			...rootClauses,
			...queryModifiers,
		]);

		const selectAttributeMap = {};
		composedModifiers.select.forEach((attr, idx) => {
			selectAttributeMap[attr] = idx;
		});

		const sql = buildSql(composedModifiers);
		const vars = varsExpressionEngine
			.evaluate({ $and: composedModifiers.vars })
			.map(castValToDb);

		const statement = db.prepare(sql).raw();
		const allResults = statement.all(vars) ?? null;

		const dataGraph = mapValues(schema.resources, () => ({}));
		const flatQuery = flattenQuery(schema, normalQuery);

		const buildExtractor = () => {
			const extractors = flatQuery.flatMap((queryPart) => {
				const { parent, parentQuery, parentRelationship, attributes, type } =
					queryPart;
				const queryPartConfig = config.resources[type];
				const { idAttribute = "id" } = queryPartConfig;

				const parentType = parent?.type;
				const parentRelDef =
					parentQuery &&
					schema.resources[parentType].relationships[parentRelationship];

				const pathStr =
					queryPart.path.length > 0 ? `$${queryPart.path.join("$")}` : "";
				const idPath = `${rootTable}${pathStr}.${idAttribute}`;
				const idIdx = selectAttributeMap[idPath];

				return (result) => {
					const id = result[idIdx];

					if (parentQuery) {
						const parentPathStr =
							queryPart.path.length > 1
								? `$${queryPart.path.slice(0, -1).join("$")}`
								: "";
						const parentIdAttribute =
							config.resources[parentType].idAttribute ?? "id";
						const parentIdPath = `${rootTable}${parentPathStr}.${parentIdAttribute}`;
						const parentIdIdx = selectAttributeMap[parentIdPath];
						const parentId = result[parentIdIdx];

						if (!dataGraph[parentType][parentId]) {
							dataGraph[parentType][parentId] = {
								[idAttribute]: parentId,
								id: parentId,
								type: parentType,
							};
						}
						const parent = dataGraph[parentType][parentId];

						if (parentRelDef.cardinality === "one") {
							parent.relationships[parentRelationship] = id
								? { id, type }
								: null;
						} else {
							parent.relationships[parentRelationship] =
								parent.relationships[parentRelationship] ?? [];

							if (
								!parent.relationships[parentRelationship].some(
									(r) => r.id === id,
								)
							) {
								parent.relationships[parentRelationship].push({ type, id });
							}
						}
					}

					if (!id) return;

					dataGraph[type][id] = dataGraph[type][id] ?? {
						id,
						type,
						attributes: {},
						relationships: {},
					};

					if (attributes.length > 0) {
						attributes.forEach((attr) => {
							const fullAttrPath = `${rootTable}${pathStr}.${attr}`;
							const resultIdx = selectAttributeMap[fullAttrPath];

							dataGraph[type][id].attributes[attr] = result[resultIdx];
						});
					} else {
						dataGraph[type][id].id = id;
						dataGraph[type][id].type = type;
					}
				};
			});

			return (result) => extractors.forEach((extractor) => extractor(result));
		};

		const extractor = buildExtractor();
		allResults.forEach((row) => extractor(row));

		return queryGraph(
			schema,
			omit(normalQuery, ["limit", "offset", "where"]),
			dataGraph,
		);
	});
}
