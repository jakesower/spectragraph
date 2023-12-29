import { defaultExpressionEngine } from "@data-prism/expressions";
import { normalizeQuery } from "./query";
const { isExpression } = defaultExpressionEngine;
export function forEachSchemaQuery(schema, query, fn) {
    const go = (subquery, info) => {
        fn(subquery, info);
        const { path, type } = info;
        const resourceSchema = schema.resources[type];
        Object.entries(subquery.select).forEach(([prop, select]) => {
            if (typeof select === "object" && !isExpression(select)) {
                const nextInfo = {
                    path: [...path, prop],
                    parent: subquery,
                    type: resourceSchema.relationships[prop].type,
                };
                go(select, nextInfo);
            }
        });
    };
    const initInfo = {
        path: [],
        parent: null,
        type: query.type,
    };
    go(normalizeQuery(query), initInfo);
}
export function reduceSchemaQuery(schema, query, fn, init) {
    const go = (subquery, info, accValue) => {
        const { path, type } = info;
        const resourceSchema = schema.resources[type];
        return Object.entries(subquery.select).reduce((acc, [prop, select]) => {
            if (typeof select !== "object" || isExpression(select))
                return acc;
            const nextInfo = {
                path: [...path, prop],
                parent: subquery,
                type: resourceSchema.relationships[prop].type,
            };
            return go(select, nextInfo, acc);
        }, fn(accValue, subquery, info));
    };
    const initInfo = {
        path: [],
        parent: null,
        type: query.type,
    };
    return go(normalizeQuery(query), initInfo, init);
}
