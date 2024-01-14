import { mapValues } from "lodash-es";
import { queryGraph } from "data-prism";
import { buildSql, composeClauses } from "./helpers/sql.js";
import { runQuery } from "./operations/operations.js";
import { flattenQuery } from "./helpers/query-helpers.ts";
import { castValToDb } from "./helpers/sql.js";
import { varsExpressionEngine } from "./helpers/sql-expressions.js";

export function get(query, context) {
	const { schema, config, rootClauses = [] } = context;
	const { db, resources, table } = config;

	const resConfig = resources[query.type];
	const rootTable = resConfig.table;

	const initModifiers = {
		from: table,
	};

	return runQuery(query, context, (queryModifiers) => {
		const composedModifiers = composeClauses([
			initModifiers,
			...rootClauses,
			...queryModifiers,
		]);

		const selectPropertyMap = {};
		composedModifiers.select.forEach((prop, idx) => {
			selectPropertyMap[prop] = idx;
		});

		const sql = buildSql(composedModifiers);
		const vars = varsExpressionEngine
			.evaluate({ $and: composedModifiers.vars })
			.map(castValToDb);

		const statement = db.prepare(sql).raw();
		const allResults = statement.all(vars) ?? null;

		const dataGraph = mapValues(schema.resources, () => ({}));
		const flatQuery = flattenQuery(schema, query);

		const buildExtractor = () => {
			const extractors = flatQuery.flatMap((queryPart) => {
				const { parent, parentQuery, parentRelationship, properties, type } =
					queryPart;
				const queryPartConfig = config.resources[type];
				const { idProperty = "id" } = queryPartConfig;

				const parentType = parent?.type;
				const parentRelDef =
					parentQuery &&
					schema.resources[parentType].relationships[parentRelationship];

				const pathStr =
					queryPart.path.length > 0 ? `$${queryPart.path.join("$")}` : "";
				const idPath = `${rootTable}${pathStr}.${idProperty}`;
				const idIdx = selectPropertyMap[idPath];

				return (result) => {
					const id = result[idIdx];

					if (parentQuery) {
						const parentPathStr =
							queryPart.path.length > 1
								? `$${queryPart.path.slice(0, -1).join("$")}`
								: "";
						const parentIdProperty =
							config.resources[parentType].idProperty ?? "id";
						const parentIdPath = `${rootTable}${parentPathStr}.${parentIdProperty}`;
						const parentIdIdx = selectPropertyMap[parentIdPath];
						const parentId = result[parentIdIdx];

						if (!dataGraph[parentType][parentId]) {
							dataGraph[parentType][parentId] = {
								[idProperty]: parentId,
								id: parentId,
							};
						}
						const parent = dataGraph[parentType][parentId];

						if (parentRelDef.cardinality === "one") {
							parent[parentRelationship] = id ?? null;
						} else {
							parent[parentRelationship] =
								parent[parentRelationship] ?? new Set();
							parent[parentRelationship].add(id);
						}
					}

					if (!id) return;
					dataGraph[type][id] = dataGraph[type][id] ?? { [idProperty]: id };

					if (properties.length > 0) {
						properties.forEach((prop) => {
							const fullPropPath = `${rootTable}${pathStr}.${prop}`;
							const resultIdx = selectPropertyMap[fullPropPath];

							dataGraph[type][id][prop] = result[resultIdx];
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

		return queryGraph(dataGraph, query);
	});
}
