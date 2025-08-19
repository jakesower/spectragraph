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
exports.parseResponse = parseResponse;
var data_prism_1 = require("data-prism");
var lodash_es_1 = require("lodash-es");
function parseResponse(schema, query, response) {
    var _a;
    if (response.data === null)
        return null;
    var graph = (0, lodash_es_1.mapValues)(schema.resources, function () { return ({}); });
    var dataArray = Array.isArray(response.data)
        ? response.data
        : [response.data];
    var extractResource = function (datum) {
        var _a;
        var _b, _c;
        var resSchema = schema.resources[datum.type];
        graph[datum.type][datum.id] = __assign(__assign({}, datum), { attributes: __assign((_a = {}, _a[(_b = resSchema.idAttribute) !== null && _b !== void 0 ? _b : "id"] = datum.id, _a), datum.attributes), relationships: (0, lodash_es_1.mapValues)((_c = datum.relationships) !== null && _c !== void 0 ? _c : {}, function (r) { return r.data; }) });
    };
    dataArray.forEach(extractResource);
    ((_a = response.included) !== null && _a !== void 0 ? _a : []).forEach(extractResource);
    return (0, data_prism_1.queryGraph)(graph, query);
}
