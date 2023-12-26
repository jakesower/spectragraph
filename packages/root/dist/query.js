import { defaultExpressionEngine } from "@data-prism/expressions";
import { mapValues } from "lodash-es";
export function compileQuery(rootQuery) {
    const stringToProp = (str) => ({ [str]: str });
    const go = (query) => {
        const { select } = query;
        const selectObj = Array.isArray(select)
            ? select.reduce((selectObj, item) => {
                const subObj = typeof item === "string" ? stringToProp(item) : item;
                return { ...selectObj, ...subObj };
            }, {})
            : select;
        const subqueries = mapValues(selectObj, (sel) => typeof sel === "object" && !defaultExpressionEngine.isExpression(sel)
            ? go(sel)
            : sel);
        return { ...query, select: subqueries };
    };
    return go(rootQuery);
}
