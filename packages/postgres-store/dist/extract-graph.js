"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractGraph = extractGraph;
var lodash_es_1 = require("lodash-es");
var query_helpers_js_1 = require("./helpers/query-helpers.js");
var column_type_modifiers_js_1 = require("./column-type-modifiers.js");
function extractGraph(rawResults, selectClause, context) {
    var schema = context.schema, rootQuery = context.query;
    var graph = (0, lodash_es_1.mapValues)(schema.resources, function () { return ({}); });
    var extractors = (0, query_helpers_js_1.flatMapQuery)(schema, rootQuery, function (_, info) {
        var parent = info.parent, parentQuery = info.parentQuery, parentRelationship = info.parentRelationship, attributes = info.attributes, type = info.type;
        var resSchema = schema.resources[type];
        var _a = resSchema.idAttribute, idAttribute = _a === void 0 ? "id" : _a;
        var selectAttributeMap = {};
        selectClause.forEach(function (attr, idx) {
            selectAttributeMap[attr.value] = idx;
        });
        var parentType = parent === null || parent === void 0 ? void 0 : parent.type;
        var parentRelDef = parentQuery &&
            schema.resources[parentType].relationships[parentRelationship];
        var pathStr = info.path.length > 0 ? "$".concat(info.path.join("$")) : "";
        var idPath = "".concat(rootQuery.type).concat(pathStr, ".").concat((0, lodash_es_1.snakeCase)(idAttribute));
        var idIdx = selectAttributeMap[idPath];
        return function (result) {
            var _a;
            var _b, _c, _d;
            var id = result[idIdx];
            if (parentQuery) {
                var parentResSchema = schema.resources[parentType];
                var parentPathStr = info.path.length > 1 ? "$".concat(info.path.slice(0, -1).join("$")) : "";
                var parentIdAttribute = (_b = parentResSchema.idAttribute) !== null && _b !== void 0 ? _b : "id";
                var parentIdPath = "".concat(rootQuery.type).concat(parentPathStr, ".").concat((0, lodash_es_1.snakeCase)(parentIdAttribute));
                var parentIdIdx = selectAttributeMap[parentIdPath];
                var parentId = result[parentIdIdx];
                if (!graph[parentType][parentId]) {
                    graph[parentType][parentId] = (_a = {},
                        _a[idAttribute] = parentId,
                        _a.id = parentId,
                        _a.type = parentType,
                        _a.attributes = {},
                        _a.relationships = {},
                        _a);
                }
                var parent_1 = graph[parentType][parentId];
                if (parentRelDef.cardinality === "one") {
                    parent_1.relationships[parentRelationship] = id ? { id: id, type: type } : null;
                }
                else {
                    parent_1.relationships[parentRelationship] =
                        (_c = parent_1.relationships[parentRelationship]) !== null && _c !== void 0 ? _c : [];
                    if (!parent_1.relationships[parentRelationship].some(function (r) { return r.id === id; })) {
                        if (id !== null) {
                            parent_1.relationships[parentRelationship].push({ type: type, id: id });
                        }
                    }
                }
            }
            if (!id)
                return;
            graph[type][id] = (_d = graph[type][id]) !== null && _d !== void 0 ? _d : {
                id: id,
                type: type,
                attributes: {},
                relationships: {},
            };
            if (attributes.length > 0) {
                attributes.forEach(function (attr) {
                    var _a;
                    var fullAttrPath = "".concat(rootQuery.type).concat(pathStr, ".").concat((0, lodash_es_1.snakeCase)(attr));
                    var resultIdx = selectAttributeMap[fullAttrPath];
                    var attrType = (_a = resSchema.attributes[attr]) === null || _a === void 0 ? void 0 : _a.type;
                    graph[type][id].attributes[attr] = column_type_modifiers_js_1.columnTypeModifiers[attrType]
                        ? column_type_modifiers_js_1.columnTypeModifiers[attrType].extract(result[resultIdx])
                        : result[resultIdx];
                });
            }
            else {
                graph[type][id].id = id;
                graph[type][id].type = type;
            }
        };
    });
    rawResults.forEach(function (row) {
        return extractors.forEach(function (extractor) { return extractor(row); });
    });
    return graph;
}
