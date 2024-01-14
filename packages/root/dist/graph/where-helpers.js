import { defaultExpressionEngine } from "@data-prism/expressions";
export function buildWhereExpression(whereClause, expressionEngine) {
    if (expressionEngine.isExpression(whereClause)) {
        const [name, params] = Object.entries(whereClause)[0];
        const built = Array.isArray(params)
            ? params.map((p) => buildWhereExpression(p, expressionEngine))
            : buildWhereExpression(params, expressionEngine);
        return { [name]: built };
    }
    const whereExpressions = Object.entries(whereClause).map(([propPath, expr]) => expressionEngine.isExpression(expr)
        ? { $pipe: [{ $get: propPath }, expr] }
        : { $pipe: [{ $get: propPath }, { $eq: expr }] });
    return whereExpressions.length > 1 ? { $and: whereExpressions } : whereExpressions[0];
}
export function buildSimpleWhereExpression(whereClause) {
    const expressionEngine = defaultExpressionEngine;
    if (expressionEngine.isExpression(whereClause)) {
        const [name, params] = Object.entries(whereClause)[0];
        const built = Array.isArray(params)
            ? params.map((p) => buildSimpleWhereExpression(p))
            : buildSimpleWhereExpression(params);
        return { [name]: built };
    }
    const whereExpressions = Object.entries(whereClause).map(([propPath, expr]) => expressionEngine.isExpression(expr)
        ? { $pipe: [{ $get: propPath }, expr] }
        : { $pipe: [{ $get: propPath }, { $eq: expr }] });
    return whereExpressions.length > 1 ? { $and: whereExpressions } : whereExpressions[0];
}
