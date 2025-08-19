"use strict";
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
exports.getOne = getOne;
exports.getAll = getAll;
var lodash_es_1 = require("lodash-es");
var column_type_modifiers_js_1 = require("./column-type-modifiers.js");
function getOne(type, id, context) {
    return __awaiter(this, void 0, void 0, function () {
        var config, _a, options, schema, _b, includeRelationships, db, resConfig, joins, table, resSchema, _c, idAttribute, attrNames, output, localRelationships, foreignRelationships, manyToManyRelationships, foreignQueries, cols, localQuery, localResult, rows, row;
        var _this = this;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    config = context.config, _a = context.options, options = _a === void 0 ? {} : _a, schema = context.schema;
                    _b = options.includeRelationships, includeRelationships = _b === void 0 ? true : _b;
                    db = config.db;
                    resConfig = config.resources[type];
                    joins = resConfig.joins, table = resConfig.table;
                    resSchema = schema.resources[type];
                    _c = resSchema.idAttribute, idAttribute = _c === void 0 ? "id" : _c;
                    attrNames = Object.keys(resSchema.attributes);
                    output = { type: type, id: id, attributes: {}, relationships: {} };
                    localRelationships = Object.entries(joins).filter(function (_a) {
                        var _ = _a[0], j = _a[1];
                        return "localColumn" in j;
                    });
                    foreignRelationships = Object.entries(joins).filter(function (_a) {
                        var _ = _a[0], j = _a[1];
                        return "foreignColumn" in j;
                    });
                    manyToManyRelationships = Object.entries(joins).filter(function (_a) {
                        var _ = _a[0], j = _a[1];
                        return "localJoinColumn" in j;
                    });
                    foreignQueries = includeRelationships
                        ? __spreadArray(__spreadArray([], foreignRelationships.map(function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
                            var foreignColumn, relSchema, relResSchema, relConfig, foreignTable, foreignId, rows;
                            var _c;
                            var joinName = _b[0], joinInfo = _b[1];
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        foreignColumn = joinInfo.foreignColumn;
                                        relSchema = resSchema.relationships[joinName];
                                        relResSchema = schema.resources[relSchema.type];
                                        relConfig = config.resources[relSchema.type];
                                        foreignTable = relConfig.table;
                                        foreignId = (0, lodash_es_1.snakeCase)((_c = relResSchema.idAttribute) !== null && _c !== void 0 ? _c : "id");
                                        return [4 /*yield*/, db.query({
                                                rowMode: "array",
                                                text: "SELECT ".concat(foreignId, " FROM ").concat(foreignTable, " WHERE ").concat(foreignColumn, " = $1"),
                                            }, [id])];
                                    case 1:
                                        rows = (_d.sent()).rows;
                                        output.relationships[joinName] =
                                            relSchema.cardinality === "one"
                                                ? rows[0]
                                                    ? { type: relSchema.type, id: rows[0][0] }
                                                    : null
                                                : rows.map(function (r) { return ({ type: relSchema.type, id: r[0] }); });
                                        return [2 /*return*/];
                                }
                            });
                        }); }), true), manyToManyRelationships.map(function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
                            var foreignJoinColumn, joinTable, localJoinColumn, relSchema, rows;
                            var joinName = _b[0], joinInfo = _b[1];
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        foreignJoinColumn = joinInfo.foreignJoinColumn, joinTable = joinInfo.joinTable, localJoinColumn = joinInfo.localJoinColumn;
                                        relSchema = resSchema.relationships[joinName];
                                        return [4 /*yield*/, db.query({
                                                rowMode: "array",
                                                text: "SELECT ".concat(foreignJoinColumn, " FROM ").concat(joinTable, " WHERE ").concat(localJoinColumn, " = $1"),
                                            }, [id])];
                                    case 1:
                                        rows = (_c.sent()).rows;
                                        output.relationships[joinName] = rows.map(function (r) { return ({
                                            type: relSchema.type,
                                            id: r[0],
                                        }); });
                                        return [2 /*return*/];
                                }
                            });
                        }); }), true) : [];
                    cols = __spreadArray(__spreadArray([], attrNames.map(function (attrName) {
                        return column_type_modifiers_js_1.columnTypeModifiers[resSchema.attributes[attrName].type]
                            ? column_type_modifiers_js_1.columnTypeModifiers[resSchema.attributes[attrName].type].select((0, lodash_es_1.snakeCase)(attrName))
                            : (0, lodash_es_1.snakeCase)(attrName);
                    }), true), localRelationships.map(function (_a) {
                        var _ = _a[0], r = _a[1];
                        return (0, lodash_es_1.snakeCase)(r.localColumn);
                    }), true).join(", ");
                    localQuery = db.query({
                        rowMode: "array",
                        text: "SELECT ".concat(cols, " FROM ").concat(table, " WHERE ").concat((0, lodash_es_1.snakeCase)(idAttribute), " = $1"),
                    }, [id]);
                    return [4 /*yield*/, Promise.all(__spreadArray([localQuery], foreignQueries, true))];
                case 1:
                    localResult = (_d.sent())[0];
                    rows = localResult.rows;
                    row = rows[0];
                    if (!row)
                        return [2 /*return*/, null];
                    attrNames.forEach(function (attr, idx) {
                        var attrType = resSchema.attributes[attr].type;
                        output.attributes[attr] =
                            typeof row[idx] === "string" && column_type_modifiers_js_1.columnTypeModifiers[attrType]
                                ? column_type_modifiers_js_1.columnTypeModifiers[attrType].extract(row[idx])
                                : row[idx];
                    });
                    if (includeRelationships) {
                        localRelationships.forEach(function (_a, idx) {
                            var relName = _a[0];
                            var id = row[idx + attrNames.length];
                            output.relationships[relName] = id
                                ? {
                                    type: resSchema.relationships[relName].type,
                                    id: id,
                                }
                                : null;
                        });
                    }
                    return [2 /*return*/, output];
            }
        });
    });
}
function getAll(type, context) {
    return __awaiter(this, void 0, void 0, function () {
        var config, _a, options, schema, _b, includeRelationships, db, resConfig, joins, table, resSchema, attrNames, resources, localRelationships, cols, localQuery, rows, foreignRelationships, manyToManyRelationships, foreignQueries;
        var _this = this;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    config = context.config, _a = context.options, options = _a === void 0 ? {} : _a, schema = context.schema;
                    _b = options.includeRelationships, includeRelationships = _b === void 0 ? true : _b;
                    db = config.db;
                    resConfig = config.resources[type];
                    joins = resConfig.joins, table = resConfig.table;
                    resSchema = schema.resources[type];
                    attrNames = Object.keys(resSchema.attributes);
                    resources = {};
                    localRelationships = Object.entries(joins).filter(function (_a) {
                        var _ = _a[0], j = _a[1];
                        return "localColumn" in j;
                    });
                    cols = __spreadArray(__spreadArray([
                        (0, lodash_es_1.snakeCase)((_c = resSchema.idAttribute) !== null && _c !== void 0 ? _c : "id")
                    ], attrNames.map(function (attrName) {
                        return column_type_modifiers_js_1.columnTypeModifiers[resSchema.attributes[attrName].type]
                            ? column_type_modifiers_js_1.columnTypeModifiers[resSchema.attributes[attrName].type].select((0, lodash_es_1.snakeCase)(attrName))
                            : (0, lodash_es_1.snakeCase)(attrName);
                    }), true), localRelationships.map(function (_a) {
                        var _ = _a[0], r = _a[1];
                        return (0, lodash_es_1.snakeCase)(r.localColumn);
                    }), true).join(", ");
                    localQuery = db.query({
                        rowMode: "array",
                        text: "SELECT ".concat(cols, " FROM ").concat(table),
                    });
                    return [4 /*yield*/, localQuery];
                case 1:
                    rows = (_d.sent()).rows;
                    rows.forEach(function (row) {
                        var resource = { type: type, id: row[0], attributes: {} };
                        if (includeRelationships) {
                            resource.relationships = (0, lodash_es_1.mapValues)(resSchema.relationships, function (rel) {
                                return rel.cardinality === "one" ? null : [];
                            });
                        }
                        attrNames.forEach(function (attr, idx) {
                            var attrType = resSchema.attributes[attr].type;
                            resource.attributes[attr] =
                                typeof row[idx + 1] === "string" && column_type_modifiers_js_1.columnTypeModifiers[attrType]
                                    ? column_type_modifiers_js_1.columnTypeModifiers[attrType].extract(row[idx + 1])
                                    : row[idx + 1];
                        });
                        if (includeRelationships) {
                            localRelationships.forEach(function (_a, idx) {
                                var relName = _a[0];
                                var id = row[idx + attrNames.length + 1];
                                resource.relationships[relName] = id
                                    ? {
                                        type: resSchema.relationships[relName].type,
                                        id: id,
                                    }
                                    : null;
                            });
                        }
                        resources[resource.id] = resource;
                    });
                    if (!includeRelationships) return [3 /*break*/, 3];
                    foreignRelationships = Object.entries(joins).filter(function (_a) {
                        var _ = _a[0], j = _a[1];
                        return "foreignColumn" in j;
                    });
                    manyToManyRelationships = Object.entries(joins).filter(function (_a) {
                        var _ = _a[0], j = _a[1];
                        return "localJoinColumn" in j;
                    });
                    foreignQueries = __spreadArray(__spreadArray([], foreignRelationships.map(function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
                        var foreignColumn, relSchema, relResSchema, relConfig, foreignTable, foreignId, rows;
                        var _c;
                        var joinName = _b[0], joinInfo = _b[1];
                        return __generator(this, function (_d) {
                            switch (_d.label) {
                                case 0:
                                    foreignColumn = joinInfo.foreignColumn;
                                    relSchema = resSchema.relationships[joinName];
                                    relResSchema = schema.resources[relSchema.type];
                                    relConfig = config.resources[relSchema.type];
                                    foreignTable = relConfig.table;
                                    foreignId = (0, lodash_es_1.snakeCase)((_c = relResSchema.idAttribute) !== null && _c !== void 0 ? _c : "id");
                                    return [4 /*yield*/, db.query({
                                            rowMode: "array",
                                            text: "SELECT ".concat(foreignColumn, ", ").concat(foreignId, " FROM ").concat(foreignTable, " WHERE ").concat(foreignColumn, " IS NOT NULL"),
                                        })];
                                case 1:
                                    rows = (_d.sent()).rows;
                                    rows.forEach(function (row) {
                                        var resource = resources[row[0]];
                                        if (relSchema.cardinality === "one") {
                                            resource.relationships[joinName] = {
                                                type: relSchema.type,
                                                id: row[1],
                                            };
                                        }
                                        else {
                                            resource.relationships[joinName].push({
                                                type: relSchema.type,
                                                id: row[1],
                                            });
                                        }
                                    });
                                    return [2 /*return*/];
                            }
                        });
                    }); }), true), manyToManyRelationships.map(function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
                        var foreignJoinColumn, joinTable, localJoinColumn, relSchema, rows;
                        var joinName = _b[0], joinInfo = _b[1];
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    foreignJoinColumn = joinInfo.foreignJoinColumn, joinTable = joinInfo.joinTable, localJoinColumn = joinInfo.localJoinColumn;
                                    relSchema = resSchema.relationships[joinName];
                                    return [4 /*yield*/, db.query({
                                            rowMode: "array",
                                            text: "SELECT ".concat(localJoinColumn, ", ").concat(foreignJoinColumn, " FROM ").concat(joinTable, " WHERE ").concat(localJoinColumn, " IS NOT NULL"),
                                        })];
                                case 1:
                                    rows = (_c.sent()).rows;
                                    rows.forEach(function (row) {
                                        var resource = resources[row[0]];
                                        resource.relationships[joinName].push({
                                            type: relSchema.type,
                                            id: row[1],
                                        });
                                    });
                                    return [2 /*return*/];
                            }
                        });
                    }); }), true);
                    return [4 /*yield*/, Promise.all(__spreadArray([], foreignQueries, true))];
                case 2:
                    _d.sent();
                    _d.label = 3;
                case 3: return [2 /*return*/, Object.values(resources)];
            }
        });
    });
}
