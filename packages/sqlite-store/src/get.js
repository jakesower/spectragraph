import { mapValues } from "lodash-es";
import { queryGraph } from "@data-prism/store-core";
import { buildSql, composeClauses } from "./helpers/sql.js";
import { runQuery } from "./operations/operations.js";
import { flattenQuery } from "./helpers/query-helpers.ts";
import { castValToDb } from "./helpers/sql.js";

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
		console.log("select props map", selectPropertyMap);

		const sql = buildSql(composedModifiers);
		console.log(composedModifiers);
		console.log(sql);
		const vars = composedModifiers.vars.map(castValToDb);
		const statement = db.prepare(sql).raw();
		const allResults = statement.all(vars) ?? null;
		console.log("ress", allResults);

		const graph = mapValues(schema.resources, () => ({}));
		const flatQuery = flattenQuery(schema, query);
		const buildExtractor = () => {
			const extractors = flatQuery.flatMap((queryPart) => {
				const { properties, resourceType } = queryPart;
				console.log("qp", queryPart);
				const pathStr = queryPart.path.length > 0 ? `$${queryPart.path.join("$")}` : "";
				const idPath = `${rootTable}${pathStr}.id`;
				const idIdx = selectPropertyMap[idPath];

				return (result) => {
					const id = result[idIdx];
					if (!id) return;
					graph[resourceType][id] = graph[resourceType][id] ?? { id };

					// the graph must be linked!!!

					properties.forEach((prop) => {
						const fullPropPath = `${rootTable}${pathStr}.${prop}`;
						const resultIdx = selectPropertyMap[fullPropPath];
						console.log(fullPropPath, resultIdx);

						graph[resourceType][id][prop] = result[resultIdx];
					});
				};
			});

			return (result) => extractors.forEach((extractor) => extractor(result));
		};

		const extractor = buildExtractor();
		allResults.forEach((row) => extractor(row));
		console.log("query", query)
		console.log("graph", graph);
		console.log("gq", queryGraph(schema, query, graph));
		return queryGraph(schema, query, graph);
	});
}
