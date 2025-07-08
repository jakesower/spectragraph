import { defaultExpressionEngine } from "@data-prism/expressions";
import { mapValues } from "lodash-es";
const { isExpression } = defaultExpressionEngine;
export function normalizeSchemalessQuery(rootSchemalessQuery) {
    const stringToProp = (str) => ({ [str]: str });
    const go = (query) => {
        const { select } = query;
        if (!select)
            throw new Error("queries must have a `select` clause");
        const selectObj = Array.isArray(select)
            ? select.reduce((selectObj, item) => {
                const subObj = typeof item === "string" ? stringToProp(item) : item;
                return { ...selectObj, ...subObj };
            }, {})
            : select;
        const subqueries = mapValues(selectObj, (sel) => typeof sel === "object" && !isExpression(sel) ? go(sel) : sel);
        const orderObj = query.order
            ? { order: !Array.isArray(query.order) ? [query.order] : query.order }
            : {};
        return {
            ...query,
            select: subqueries,
            ...orderObj,
        };
    };
    return go(rootSchemalessQuery);
}
export function forEachSchemalessQuery(query, fn) {
    const go = (subquery, info) => {
        fn(subquery, info);
        Object.entries(subquery.select).forEach(([prop, select]) => {
            if (typeof select === "object" && !isExpression(select)) {
                const nextInfo = {
                    path: [...info.path, prop],
                    parent: subquery,
                };
                go(select, nextInfo);
            }
        });
    };
    const initInfo = {
        path: [],
        parent: null,
    };
    go(normalizeSchemalessQuery(query), initInfo);
}
export function mapSchemalessQuery(query, fn) {
    const go = (subquery, info) => {
        const mappedSelect = mapValues(subquery.select, (select, prop) => {
            if (typeof select !== "object" || isExpression(select))
                return select;
            const nextInfo = {
                path: [...info.path, prop],
                parent: subquery,
            };
            return go(select, nextInfo);
        });
        return fn({ ...subquery, select: mappedSelect }, info);
    };
    const initInfo = {
        path: [],
        parent: null,
    };
    return go(normalizeSchemalessQuery(query), initInfo);
}
export function reduceSchemalessQuery(query, fn, init) {
    const go = (subquery, info, accValue) => Object.entries(subquery.select).reduce((acc, [prop, select]) => {
        if (typeof select !== "object" || isExpression(select))
            return acc;
        const nextInfo = {
            path: [...info.path, prop],
            parent: subquery,
        };
        return go(select, nextInfo, acc);
    }, fn(accValue, subquery, info));
    const initInfo = {
        path: [],
        parent: null,
    };
    return go(normalizeSchemalessQuery(query), initInfo, init);
}
