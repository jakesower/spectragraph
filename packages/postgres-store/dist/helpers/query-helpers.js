"use strict";
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
exports.flattenQuery = flattenQuery;
exports.flatMapQuery = flatMapQuery;
exports.forEachQuery = forEachQuery;
exports.reduceQuery = reduceQuery;
exports.someQuery = someQuery;
var lodash_es_1 = require("lodash-es");
function flattenQuery(schema, rootQuery) {
    var go = function (query, type, path, parent, parentRelationship) {
        var _a, _b;
        if (parent === void 0) { parent = null; }
        if (parentRelationship === void 0) { parentRelationship = null; }
        var resDef = schema.resources[type];
        var _c = resDef.idAttribute, idAttribute = _c === void 0 ? "id" : _c;
        var _d = (0, lodash_es_1.partition)(Object.entries((_a = query.select) !== null && _a !== void 0 ? _a : {}), function (_a) {
            var propVal = _a[1];
            return typeof propVal === "string" &&
                (propVal in resDef.attributes || propVal === idAttribute);
        }), attributesEntries = _d[0], relationshipsEntries = _d[1];
        var attributes = attributesEntries.map(function (pe) { return pe[1]; });
        var relationshipKeys = relationshipsEntries.map(function (pe) { return pe[0]; });
        var level = {
            parent: parent,
            parentQuery: (_b = parent === null || parent === void 0 ? void 0 : parent.query) !== null && _b !== void 0 ? _b : null,
            parentRelationship: parentRelationship,
            path: path,
            attributes: attributes,
            query: query,
            ref: !query.select,
            relationships: (0, lodash_es_1.pick)(query.select, relationshipKeys),
            type: type,
        };
        return __spreadArray([
            level
        ], relationshipKeys.flatMap(function (relKey) {
            var relDef = resDef.relationships[relKey];
            var subquery = query.select[relKey];
            return go(subquery, relDef.type, __spreadArray(__spreadArray([], path, true), [relKey], false), level, relKey);
        }), true);
    };
    return go(rootQuery, rootQuery.type, []);
}
function flatMapQuery(schema, query, fn) {
    return flattenQuery(schema, query).flatMap(function (info) { return fn(info.query, info); });
}
function forEachQuery(schema, query, fn) {
    return flattenQuery(schema, query).forEach(function (info) { return fn(info.query, info); });
}
function reduceQuery(schema, query, fn, initVal) {
    return flattenQuery(schema, query).reduce(function (acc, q) { return fn(acc, q.query, q); }, initVal);
}
function someQuery(schema, query, fn) {
    return flattenQuery(schema, query).some(function (q) { return fn(q.query, q); });
}
