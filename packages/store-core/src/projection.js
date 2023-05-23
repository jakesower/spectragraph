import { mapValues } from "lodash-es";
import { createExpressionEngine } from "@data-prism/expression";
function distributeStrings(expression) {
    const { isExpression } = createExpressionEngine({});
    if (typeof expression === "string") {
        const [iteratee, ...rest] = expression.split(".$.");
        if (rest.length === 0)
            return { $get: expression };
        return {
            $flatMap: [distributeStrings(iteratee), distributeStrings(rest.join(".$."))],
        };
    }
    if (!isExpression(expression)) {
        return Array.isArray(expression)
            ? expression.map(distributeStrings)
            : typeof expression === "object"
                ? mapValues(expression, distributeStrings)
                : expression;
    }
    const [expressionName, expressionArgs] = Object.entries(expression)[0];
    const terminalExpressions = ["$literal", "$var", "$get", "$prop"];
    if (terminalExpressions.includes(expressionName))
        return expression;
    return { [expressionName]: distributeStrings(expressionArgs) };
}
export function projectionQueryProperties(projection) {
    const { isExpression } = createExpressionEngine({});
    const terminalExpressions = ["$literal", "$var"];
    const go = (val) => {
        if (isExpression(val)) {
            const [exprName, exprVal] = Object.entries(val)[0];
            if (terminalExpressions.includes(exprName)) {
                return [];
            }
            return go(exprVal);
        }
        if (Array.isArray(val)) {
            return val.map(go);
        }
        if (typeof val === "object") {
            return Object.values(val).map(go);
        }
        return [val.split(".").filter((v) => v !== "$")];
    };
    // mutates!
    const makePath = (obj, path) => {
        const [head, ...tail] = path;
        if (tail.length === 0) {
            obj[head] = true;
            return;
        }
        if (!obj[head])
            obj[head] = { properties: {} };
        makePath(obj[head].properties, tail);
    };
    const propertyPaths = Object.values(projection).flatMap(go);
    const query = {};
    propertyPaths.forEach((path) => makePath(query, path));
    return query;
}
export function project(results, projection) {
    const { evaluate } = createExpressionEngine({});
    const projFns = mapValues(projection, (projProp) => {
        const expr = distributeStrings(projProp);
        return (result) => evaluate(expr, result);
    });
    return results.map((result) => {
        return mapValues(projFns, (fn) => fn(result) ?? null);
    });
}
