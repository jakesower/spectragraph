import { mapValues, omit, snakeCase } from "lodash-es";
import { mapSchemalessQuery, queryGraph } from "data-prism";
import { buildSql, composeClauses } from "./helpers/sql.js";
import { runQuery } from "./operations/operations.js";
import { flattenQuery } from "./helpers/query-helpers.js";
import { varsExpressionEngine } from "./helpers/sql-expressions.js";
function replaceQuestionMarksWithNumbers(inputString) {
    let counter = 1;
    return inputString.replace(/\?/g, () => `$${counter++}`);
}
export async function query(query, context) {
    const { schema, config, rootClauses = [] } = context;
    const { db, resources } = config;
    const resConfig = resources[query.type];
    const rootTable = resConfig.table;
    const initModifiers = {
        from: rootTable,
    };
    return runQuery(query, context, async (queryModifiers) => {
        const composedModifiers = composeClauses([
            initModifiers,
            ...rootClauses,
            ...queryModifiers,
        ]);
        const selectAttributeMap = {};
        composedModifiers.select.forEach((attr, idx) => {
            selectAttributeMap[attr] = idx;
        });
        const sql = replaceQuestionMarksWithNumbers(buildSql(composedModifiers));
        const vars = varsExpressionEngine.evaluate({
            $and: composedModifiers.vars,
        });
        const allResults = (await db.query({ rowMode: "array", text: sql }, vars))?.rows ?? null;
        const dataGraph = mapValues(schema.resources, () => ({}));
        const flatQuery = flattenQuery(schema, query);
        const buildExtractor = () => {
            const extractors = flatQuery.flatMap((queryPart) => {
                const { parent, parentQuery, parentRelationship, attributes, type } = queryPart;
                const queryPartConfig = config.resources[type];
                const { idAttribute = "id" } = queryPartConfig;
                const parentType = parent?.type;
                const parentRelDef = parentQuery &&
                    schema.resources[parentType].relationships[parentRelationship];
                const pathStr = queryPart.path.length > 0 ? `$${queryPart.path.join("$")}` : "";
                const idPath = `${rootTable}${pathStr}.${snakeCase(idAttribute)}`;
                const idIdx = selectAttributeMap[idPath];
                return (result) => {
                    const id = result[idIdx];
                    if (parentQuery) {
                        const parentPathStr = queryPart.path.length > 1
                            ? `$${queryPart.path.slice(0, -1).join("$")}`
                            : "";
                        const parentIdAttribute = config.resources[parentType].idAttribute ?? "id";
                        const parentIdPath = `${rootTable}${parentPathStr}.${snakeCase(parentIdAttribute)}`;
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
                        }
                        else {
                            parent.relationships[parentRelationship] =
                                parent.relationships[parentRelationship] ?? [];
                            if (!parent.relationships[parentRelationship].some((r) => r.id === id)) {
                                parent.relationships[parentRelationship].push({ type, id });
                            }
                        }
                    }
                    if (!id)
                        return;
                    dataGraph[type][id] = dataGraph[type][id] ?? {
                        id,
                        type,
                        attributes: {},
                        relationships: {},
                    };
                    if (attributes.length > 0) {
                        attributes.forEach((attr) => {
                            const fullAttrPath = `${rootTable}${pathStr}.${snakeCase(attr)}`;
                            const resultIdx = selectAttributeMap[fullAttrPath];
                            dataGraph[type][id].attributes[attr] = result[resultIdx];
                        });
                    }
                    else {
                        dataGraph[type][id].id = id;
                        dataGraph[type][id].type = type;
                    }
                };
            });
            return (result) => extractors.forEach((extractor) => extractor(result));
        };
        const extractor = buildExtractor();
        allResults.forEach((row) => extractor(row));
        return queryGraph(dataGraph, mapSchemalessQuery(query, (q) => omit(q, ["limit", "offset", "where"])));
    });
}
