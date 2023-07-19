import { mapValues } from "lodash-es";
import { buildSql, composeClauses } from "./helpers/sql.js";
import { runQuery } from "./operations/operations.js";
import { flattenQuery } from "./helpers/query-helpers.ts";
import { castValToDb } from "./helpers/sql.js";
import { createGraph } from "@data-prism/store-core";

export function get(query, context) {
	const { schema, db, config, rootClauses = [] } = context;
	const resConfig = config.resources[query.type];
	const rootTable = resConfig.table;

	const initModifiers = {
		from: resConfig.table,
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
		const vars = composedModifiers.vars.map(castValToDb);
		console.log("qm", queryModifiers);
		console.log(sql, vars);
		const statement = db.prepare(sql).raw();
		const allResults = statement.all(vars) ?? null;

		console.log(composedModifiers);

		const dataGraph = mapValues(schema.resources, () => ({}));
		const flatQuery = flattenQuery(schema, query);

		const buildExtractor = () => {
			const extractors = flatQuery.flatMap((queryPart) => {
				const { parentQuery, parentRelationship, properties, type } = queryPart;
				const parentType = parentQuery?.type;
				const parentRelDef =
					parentQuery && schema.resources[parentType].relationships[parentRelationship];

				const pathStr = queryPart.path.length > 0 ? `$${queryPart.path.join("$")}` : "";
				const idPath = `${rootTable}${pathStr}.id`;
				const idIdx = selectPropertyMap[idPath];

				return (result) => {
					const id = result[idIdx];

					if (parentQuery) {
						const parentPathStr =
							queryPart.path.length > 1
								? `$${queryPart.path.slice(0, -1).join("$")}`
								: "";
						const parentIdPath = `${rootTable}${parentPathStr}.id`;
						const parentIdIdx = selectPropertyMap[parentIdPath];
						const parentId = result[parentIdIdx];
						const parent = dataGraph[parentType][parentId];

						if (parentRelDef.cardinality === "one") {
							parent[parentRelationship] = id ?? null;
						} else {
							parent[parentRelationship] = parent[parentRelationship] ?? [];
							parent[parentRelationship].push(id);
						}
					}

					if (!id) return;
					dataGraph[type][id] = dataGraph[type][id] ?? { id };

					properties.forEach((prop) => {
						const fullPropPath = `${rootTable}${pathStr}.${prop}`;
						const resultIdx = selectPropertyMap[fullPropPath];

						dataGraph[type][id][prop] = result[resultIdx];
					});
				};
			});

			return (result) => extractors.forEach((extractor) => extractor(result));
		};

		const extractor = buildExtractor();
		allResults.forEach((row) => extractor(row));
		console.log(dataGraph);

		return createGraph(schema, dataGraph).getTrees(query);

		// The result graph must be transformed into trees!

		return graph;
	});
}
