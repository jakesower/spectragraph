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
exports.preQueryRelationships = void 0;
var lodash_es_1 = require("lodash-es");
function makeRelBuilders(schema) {
    return {
        one: {
            one: function (params) {
                var foreignConfig = params.foreignConfig, foreignTableAlias = params.foreignTableAlias, localConfig = params.localConfig, localQueryTableName = params.localQueryTableName, relName = params.relName, foreignIdCol = params.foreignIdCol;
                var localColumn = localConfig.joins[relName].localColumn;
                var foreignTable = foreignConfig.table;
                return [
                    "LEFT JOIN ".concat(foreignTable, " AS ").concat(foreignTableAlias, " ON ").concat(localQueryTableName, ".").concat(localColumn, " = ").concat(foreignTableAlias, ".").concat(foreignIdCol),
                ];
            },
            many: function (params) {
                var foreignConfig = params.foreignConfig, localIdCol = params.localIdCol, localConfig = params.localConfig, localQueryTableName = params.localQueryTableName, relName = params.relName, foreignTableAlias = params.foreignTableAlias;
                var foreignTable = foreignConfig.table;
                var foreignJoinColumn = localConfig.joins[relName].foreignColumn;
                return [
                    "LEFT JOIN ".concat(foreignTable, " AS ").concat(foreignTableAlias, " ON ").concat(localQueryTableName, ".").concat(localIdCol, " = ").concat(foreignTableAlias, ".").concat(foreignJoinColumn),
                ];
            },
        },
        many: {
            one: function (params) {
                var localConfig = params.localConfig, localQueryTableName = params.localQueryTableName, relName = params.relName, foreignConfig = params.foreignConfig, foreignTableAlias = params.foreignTableAlias, foreignIdCol = params.foreignIdCol;
                var localJoinColumn = localConfig.joins[relName].localColumn;
                var foreignTable = foreignConfig.table;
                return [
                    "LEFT JOIN ".concat(foreignTable, " AS ").concat(foreignTableAlias, " ON ").concat(localQueryTableName, ".").concat(localJoinColumn, " = ").concat(foreignTableAlias, ".").concat(foreignIdCol),
                ];
            },
            many: function (params) {
                var foreignConfig = params.foreignConfig, localConfig = params.localConfig, localQueryTableName = params.localQueryTableName, relName = params.relName, foreignTableAlias = params.foreignTableAlias, localIdCol = params.localIdCol, foreignIdCol = params.foreignIdCol;
                var foreignTable = foreignConfig.table;
                var joinTableName = "".concat(localQueryTableName, "$$").concat(relName);
                var _a = localConfig.joins[relName], joinTable = _a.joinTable, localJoinColumn = _a.localJoinColumn, foreignJoinColumn = _a.foreignJoinColumn;
                return [
                    "LEFT JOIN ".concat(joinTable, " AS ").concat(joinTableName, " ON ").concat(localQueryTableName, ".").concat(localIdCol, " = ").concat(joinTableName, ".").concat(localJoinColumn),
                    "LEFT JOIN ".concat(foreignTable, " AS ").concat(foreignTableAlias, " ON ").concat(foreignTableAlias, ".").concat(foreignIdCol, " = ").concat(joinTableName, ".").concat(foreignJoinColumn),
                ];
            },
        },
        none: {
            // one({ localResSchema, localTableAlias, relName, path }) {
            //   // TODO
            // },
            many: function (_a) {
                var _b;
                var localResSchema = _a.localResSchema, localQueryTableName = _a.localQueryTableName, relName = _a.relName, foreignTableAlias = _a.foreignTableAlias;
                var localRelDef = localResSchema.attributes[relName];
                var localJoinColumn = localRelDef.store.join.joinColumn;
                var foreignResSchema = schema.resources[localRelDef.relatedType];
                var foreignTable = foreignResSchema.store.table;
                var foreignRelDef = (_b = foreignResSchema === null || foreignResSchema === void 0 ? void 0 : foreignResSchema.attributes) === null || _b === void 0 ? void 0 : _b[localRelDef.inverse];
                var foreignJoinColumn = foreignRelDef
                    ? foreignRelDef.store.join.joinColumn
                    : localRelDef.store.join.foreignJoinColumn;
                var joinTable = localRelDef.store.join.joinTable;
                var joinTableName = "".concat(localQueryTableName, "$$").concat(relName);
                return [
                    "LEFT JOIN ".concat(joinTable, " AS ").concat(joinTableName, " ON ").concat(localQueryTableName, ".id = ").concat(joinTableName, ".").concat(localJoinColumn),
                    "LEFT JOIN ".concat(foreignTable, " AS ").concat(foreignTableAlias, " ON ").concat(foreignTableAlias, ".id = ").concat(joinTableName, ".").concat(foreignJoinColumn),
                ];
            },
        },
    };
}
var preQueryRelationships = function (context) {
    var _a, _b, _c;
    var config = context.config, queryInfo = context.queryInfo, rootQuery = context.rootQuery, schema = context.schema;
    var parent = queryInfo.parent, queryPath = queryInfo.path;
    if (queryPath.length === 0)
        return {};
    var parentPath = queryPath.slice(0, -1);
    var tablePath = __spreadArray([rootQuery.type], queryPath, true);
    var parentTablePath = __spreadArray([rootQuery.type], parentPath, true);
    var relName = (0, lodash_es_1.last)(queryPath);
    var relBuilders = makeRelBuilders(schema);
    var localQueryTableName = parentTablePath.join("$");
    var localConfig = config.resources[parent.type];
    var localResSchema = schema.resources[parent.type];
    var localIdCol = (0, lodash_es_1.snakeCase)((_a = localResSchema.idAttribute) !== null && _a !== void 0 ? _a : "id");
    var localRelDef = localResSchema.relationships[relName];
    var foreignConfig = config.resources[localRelDef.type];
    var foreignResSchema = schema.resources[localRelDef.type];
    var foreignIdCol = (0, lodash_es_1.snakeCase)((_b = foreignResSchema.idAttribute) !== null && _b !== void 0 ? _b : "id");
    var foreignRelDef = foreignResSchema.relationships[localRelDef.inverse];
    var foreignTableAlias = tablePath.join("$");
    var localResCardinality = localRelDef.cardinality;
    var foreignResCardinality = (_c = foreignRelDef === null || foreignRelDef === void 0 ? void 0 : foreignRelDef.cardinality) !== null && _c !== void 0 ? _c : "none";
    var builderArgs = {
        localConfig: localConfig,
        localRelDef: localRelDef,
        localResSchema: localResSchema,
        localQueryTableName: localQueryTableName,
        localIdCol: localIdCol,
        relName: relName,
        foreignConfig: foreignConfig,
        foreignTableAlias: foreignTableAlias,
        foreignIdCol: foreignIdCol,
    };
    var join = relBuilders[foreignResCardinality][localResCardinality](builderArgs);
    return { join: join };
};
exports.preQueryRelationships = preQueryRelationships;
