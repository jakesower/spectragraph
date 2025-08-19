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
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatResponse = formatResponse;
var utils_1 = require("@data-prism/utils");
var data_prism_1 = require("data-prism");
var lodash_es_1 = require("lodash-es");
function formatResponse(schema, query, result) {
    if (result === null)
        return { data: null };
    var dataIds = new Set();
    var data = (0, utils_1.applyOrMap)(result, function (res) {
        var _a, _b, _c;
        var resSchema = schema.resources[query.type];
        var normalized = (0, data_prism_1.normalizeResource)(query.type, res, schema);
        dataIds.add(res[(_a = resSchema.idAttribute) !== null && _a !== void 0 ? _a : "id"]);
        return {
            type: query.type,
            id: res[(_b = resSchema.idAttribute) !== null && _b !== void 0 ? _b : "id"],
            attributes: (0, lodash_es_1.omit)(normalized.attributes, [(_c = resSchema.idAttribute) !== null && _c !== void 0 ? _c : "id"]),
            relationships: (0, lodash_es_1.mapValues)(normalized.relationships, function (rel) { return ({
                data: rel,
            }); }),
        };
    });
    var normalizedQuery = (0, data_prism_1.normalizeQuery)(query);
    var hasIncluded = Object.values(normalizedQuery.select).some(function (s) { return typeof s === "object"; });
    if (!hasIncluded) {
        return { data: data };
    }
    var graph = (0, data_prism_1.createGraphFromTrees)(query.type, Array.isArray(result) ? result : [result], schema);
    var included = [];
    Object.entries(graph).forEach(function (_a) {
        var type = _a[0], ress = _a[1];
        var relDef = schema.resources[type];
        Object.entries(ress).forEach(function (_a) {
            var _b;
            var id = _a[0], res = _a[1];
            if (type === query.type && dataIds.has(id))
                return;
            included.push({
                type: type,
                id: id,
                attributes: (0, lodash_es_1.omit)(res.attributes, (_b = relDef.idAttribute) !== null && _b !== void 0 ? _b : "id"),
                relationships: (0, lodash_es_1.mapValues)(res.relationships, function (rel) { return ({ data: rel }); }),
            });
        });
    });
    return __assign({ data: data }, (included.length === 0 ? {} : { included: included }));
}
