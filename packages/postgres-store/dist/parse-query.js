"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseQuery = parseQuery;
var lodash_es_1 = require("lodash-es");
var sql_expressions_js_1 = require("./helpers/sql-expressions.js");
var query_helpers_js_1 = require("./helpers/query-helpers.js");
var relationships_js_1 = require("./relationships.js");
var column_type_modifiers_js_1 = require("./column-type-modifiers.js");
var hasToManyRelationship = function (schema, query) {
    return (0, query_helpers_js_1.someQuery)(schema, query, function (_, info) {
        return Object.keys(info.relationships).some(function (relName) {
            return schema.resources[info.type].relationships[relName].cardinality ===
                "many";
        });
    });
};
var QUERY_CLAUSE_EXTRACTORS = {
    id: function (id, _a) {
        var queryInfo = _a.queryInfo, schema = _a.schema;
        if (!id)
            return {};
        var _b = schema.resources[queryInfo.type].idAttribute, idAttribute = _b === void 0 ? "id" : _b;
        return {
            where: ["".concat(queryInfo.type, ".").concat((0, lodash_es_1.snakeCase)(idAttribute), " = ?")],
            vars: [id],
        };
    },
    where: function (where, _a) {
        var table = _a.table;
        var propExprs = Object.entries(where).map(function (_a) {
            var _b;
            var propKey = _a[0], propValOrExpr = _a[1];
            if (sql_expressions_js_1.whereExpressionEngine.isExpression(where)) {
                // TODO
                var _c = Object.entries(where)[0], operation = _c[0], args = _c[1];
                return sql_expressions_js_1.whereExpressionEngine.evaluate(where);
            }
            if (sql_expressions_js_1.whereExpressionEngine.isExpression(propValOrExpr)) {
                var _d = Object.entries(propValOrExpr)[0], operation = _d[0], args = _d[1];
                return _b = {}, _b[operation] = ["".concat(table, ".").concat((0, lodash_es_1.snakeCase)(propKey)), args], _b;
            }
            return { $eq: ["".concat(table, ".").concat((0, lodash_es_1.snakeCase)(propKey)), propValOrExpr] };
        });
        var expr = { $and: propExprs };
        return { where: [expr], vars: [expr] };
    },
    order: function (order, _a) {
        var table = _a.table;
        return {
            orderBy: (Array.isArray(order) ? order : [order]).map(function (orderEntry) {
                var k = Object.keys(orderEntry)[0];
                return {
                    property: k,
                    direction: orderEntry[k],
                    table: table,
                };
            }),
        };
    },
    limit: function (limit, _a) {
        var _b;
        var query = _a.query, queryInfo = _a.queryInfo, schema = _a.schema;
        if (limit < 0) {
            throw new Error("`limit` must be at least 0");
        }
        return queryInfo.path.length > 0 || hasToManyRelationship(schema, query)
            ? {}
            : { limit: limit, offset: (_b = query.offset) !== null && _b !== void 0 ? _b : 0 };
    },
    offset: function (offset, _a) {
        var query = _a.query;
        if (offset < 0) {
            throw new Error("`offset` must be at least 0");
        }
        if (!query.limit) {
            return { offset: offset };
        }
        return [];
    },
    select: function (select, context) {
        var schema = context.schema, table = context.table, queryInfo = context.queryInfo;
        var type = queryInfo.type;
        var _a = schema.resources[type].idAttribute, idAttribute = _a === void 0 ? "id" : _a;
        var resSchema = schema.resources[type];
        var attributeProps = Object.values(select).filter(function (p) { return typeof p === "string"; });
        var relationshipsModifiers = (0, relationships_js_1.preQueryRelationships)(context);
        return __assign({ select: (0, lodash_es_1.uniq)(__spreadArray([idAttribute], attributeProps, true)).map(function (col) {
                var attrSchema = resSchema.attributes[col];
                var value = "".concat(table, ".").concat((0, lodash_es_1.snakeCase)(col));
                return {
                    value: value,
                    sql: attrSchema && column_type_modifiers_js_1.columnTypeModifiers[attrSchema.type]
                        ? column_type_modifiers_js_1.columnTypeModifiers[attrSchema.type].select(value)
                        : value,
                };
            }) }, relationshipsModifiers);
    },
};
function parseQuery(query, context) {
    var schema = context.schema;
    var clauses = [];
    (0, query_helpers_js_1.forEachQuery)(schema, query, function (subquery, queryInfo) {
        var table = __spreadArray([query.type], queryInfo.path, true).join("$");
        Object.entries(subquery).forEach(function (_a) {
            var key = _a[0], val = _a[1];
            if (QUERY_CLAUSE_EXTRACTORS[key]) {
                clauses.push(QUERY_CLAUSE_EXTRACTORS[key](val, __assign(__assign({}, context), { queryInfo: queryInfo, rootQuery: query, query: subquery, table: table })));
            }
        });
    });
    return clauses;
}
