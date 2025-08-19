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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
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
exports.SQL_CLAUSE_CONFIG = void 0;
exports.replacePlaceholders = replacePlaceholders;
exports.query = query;
var lodash_es_1 = require("lodash-es");
var data_prism_1 = require("data-prism");
var sql_expressions_js_1 = require("./helpers/sql-expressions.js");
var parse_query_js_1 = require("./parse-query.js");
var extract_graph_js_1 = require("./extract-graph.js");
var sql_expressions_js_2 = require("./helpers/sql-expressions.js");
var defaultClause = {
    compose: function (acc, item) { return (0, lodash_es_1.uniq)(__spreadArray(__spreadArray([], (acc !== null && acc !== void 0 ? acc : []), true), (item !== null && item !== void 0 ? item : []), true)); },
    initVal: [],
};
exports.SQL_CLAUSE_CONFIG = {
    select: __assign(__assign({}, defaultClause), { toSql: function (val) { return "SELECT ".concat(val.map(function (v) { return v.sql; }).join(", ")); } }),
    vars: __assign(__assign({}, defaultClause), { toSql: function () { return ""; } }),
    from: {
        initVal: null,
        compose: function (_, val) { return val; },
        toSql: function (val) { return "FROM ".concat(val); },
    },
    join: __assign(__assign({}, defaultClause), { toSql: function (val) { return val.join("\n"); } }),
    where: __assign(__assign({}, defaultClause), { toSql: function (val) {
            return val.length > 0
                ? "WHERE ".concat(sql_expressions_js_2.whereExpressionEngine.evaluate({ $and: val }))
                : "";
        } }),
    orderBy: __assign(__assign({}, defaultClause), { toSql: function (val) {
            if (val.length === 0)
                return "";
            var orderClauses = val.map(function (_a) {
                var property = _a.property, direction = _a.direction, table = _a.table;
                return "".concat(table, ".").concat((0, lodash_es_1.snakeCase)(property)).concat(direction === "desc" ? " DESC" : "");
            });
            return "ORDER BY ".concat(orderClauses.join(", "));
        } }),
    limit: __assign(__assign({}, defaultClause), { compose: function (acc, item) { return Math.min(acc, item); }, initVal: Infinity, toSql: function (val) { return (val < Infinity ? "LIMIT ".concat(val) : ""); } }),
    offset: __assign(__assign({}, defaultClause), { compose: function (_, item) { return item; }, initVal: 0, toSql: function (val) { return (val > 0 ? "OFFSET ".concat(val) : ""); } }),
};
function replacePlaceholders(inputString) {
    var counter = 1;
    return inputString.replace(/\?/g, function () { return "$".concat(counter++); });
}
function query(query, context) {
    return __awaiter(this, void 0, void 0, function () {
        var config, schema, db, clauseBreakdown, initSqlClauses, sqlClauses, sql, vars, allResults, hasToManyJoin, handledClauses, graph, strippedQuery;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    config = context.config, schema = context.schema;
                    db = config.db;
                    clauseBreakdown = (0, parse_query_js_1.parseQuery)(query, context);
                    initSqlClauses = __assign(__assign({}, (0, lodash_es_1.mapValues)(exports.SQL_CLAUSE_CONFIG, function (c) { return c.initVal; })), { from: "".concat(config.resources[query.type].table, " AS ").concat(query.type) });
                    sqlClauses = clauseBreakdown.reduce(function (acc, clause) { return (__assign(__assign({}, acc), (0, lodash_es_1.mapValues)(clause, function (val, key) {
                        return exports.SQL_CLAUSE_CONFIG[key].compose(acc[key], val);
                    }))); }, initSqlClauses);
                    sql = replacePlaceholders(Object.entries(exports.SQL_CLAUSE_CONFIG)
                        .map(function (_a) {
                        var k = _a[0], v = _a[1];
                        return v.toSql(sqlClauses[k]);
                    })
                        .filter(Boolean)
                        .join("\n"));
                    vars = sql_expressions_js_1.varsExpressionEngine.evaluate({
                        $and: sqlClauses.vars,
                    });
                    return [4 /*yield*/, db.query({ rowMode: "array", text: sql }, vars)];
                case 1:
                    allResults = (_b = (_a = (_c.sent())) === null || _a === void 0 ? void 0 : _a.rows) !== null && _b !== void 0 ? _b : null;
                    hasToManyJoin = Object.keys((0, data_prism_1.normalizeQuery)(query).select).some(function (k) { var _a; return ((_a = schema.resources[query.type].relationships[k]) === null || _a === void 0 ? void 0 : _a.cardinality) === "many"; });
                    handledClauses = hasToManyJoin
                        ? ["where"]
                        : ["limit", "offset", "where"];
                    graph = (0, extract_graph_js_1.extractGraph)(allResults, sqlClauses.select, context);
                    strippedQuery = (0, data_prism_1.mapSchemalessQuery)(query, function (q) {
                        return (0, lodash_es_1.omit)(q, handledClauses);
                    });
                    return [2 /*return*/, (0, data_prism_1.queryGraph)(graph, strippedQuery)];
            }
        });
    });
}
