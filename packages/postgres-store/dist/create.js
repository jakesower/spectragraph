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
exports.create = create;
var lodash_es_1 = require("lodash-es");
var query_js_1 = require("./query.js");
function create(resource, context) {
    return __awaiter(this, void 0, void 0, function () {
        var config, schema, db, resConfig, joins, table, resSchema, _a, idAttribute, attributeColumns, localRelationships, relationshipColumns, idColumns, idVars, columns, placeholders, vars, sql, rows, created, foreignRelationships, m2mForeignRelationships;
        var _this = this;
        var _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    config = context.config, schema = context.schema;
                    db = config.db;
                    resConfig = config.resources[resource.type];
                    joins = resConfig.joins, table = resConfig.table;
                    resSchema = schema.resources[resource.type];
                    _a = resSchema.idAttribute, idAttribute = _a === void 0 ? "id" : _a;
                    attributeColumns = Object.keys(resource.attributes).map(lodash_es_1.snakeCase);
                    localRelationships = (0, lodash_es_1.pickBy)((_b = resource.relationships) !== null && _b !== void 0 ? _b : {}, function (_, k) { return joins[k].localColumn; });
                    relationshipColumns = Object.keys(localRelationships).map(function (r) { return resConfig.joins[r].localColumn; });
                    idColumns = resource.id ? [(0, lodash_es_1.snakeCase)(idAttribute)] : [];
                    idVars = resource.id ? [resource.id] : [];
                    columns = __spreadArray(__spreadArray(__spreadArray([], attributeColumns, true), relationshipColumns, true), idColumns, true);
                    placeholders = (0, query_js_1.replacePlaceholders)(columns.map(function () { return "?"; }).join(", "));
                    vars = __spreadArray(__spreadArray(__spreadArray([], Object.values(resource.attributes), true), Object.values(localRelationships).map(function (r) { var _a; return (_a = r === null || r === void 0 ? void 0 : r.id) !== null && _a !== void 0 ? _a : null; }), true), idVars, true);
                    sql = "\n    INSERT INTO ".concat(table, "\n      (").concat(columns.join(", "), ")\n    VALUES\n      (").concat(placeholders, ")\n\t\tRETURNING *\n  ");
                    return [4 /*yield*/, db.query(sql, vars)];
                case 1:
                    rows = (_f.sent()).rows;
                    created = {};
                    Object.entries(rows[0]).forEach(function (_a) {
                        var k = _a[0], v = _a[1];
                        created[(0, lodash_es_1.camelCase)(k)] = v;
                    });
                    foreignRelationships = (0, lodash_es_1.pickBy)((_c = resource.relationships) !== null && _c !== void 0 ? _c : {}, function (_, k) { return joins[k].foreignColumn; });
                    return [4 /*yield*/, Promise.all(Object.entries(foreignRelationships).map(function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
                            var foreignColumn, foreignIdAttribute, foreignTable;
                            var _c;
                            var relName = _b[0], val = _b[1];
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        foreignColumn = joins[relName].foreignColumn;
                                        foreignIdAttribute = (_c = schema.resources[resSchema.relationships[relName].type].idAttribute) !== null && _c !== void 0 ? _c : "id";
                                        foreignTable = config.resources[resSchema.relationships[relName].type].table;
                                        return [4 /*yield*/, db.query("\n\t\t\t\tUPDATE ".concat(foreignTable, "\n\t\t\t\tSET ").concat(foreignColumn, " = NULL\n\t\t\t\tWHERE ").concat(foreignColumn, " = $1\n\t\t\t"), [resource.id])];
                                    case 1:
                                        _d.sent();
                                        return [4 /*yield*/, db.query("\n\t\t\t\tUPDATE ".concat(foreignTable, "\n\t\t\t\tSET ").concat(foreignColumn, " = $1\n\t\t\t\tWHERE ").concat(foreignIdAttribute, " = ANY ($2)\n\t\t\t"), [created[idAttribute], val.map(function (v) { return v.id; })])];
                                    case 2:
                                        _d.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 2:
                    _f.sent();
                    m2mForeignRelationships = (0, lodash_es_1.pickBy)((_d = resource.relationships) !== null && _d !== void 0 ? _d : {}, function (_, k) { return joins[k].joinTable; });
                    return [4 /*yield*/, Promise.all(Object.entries(m2mForeignRelationships).map(function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
                            var _c, joinTable, localJoinColumn, foreignJoinColumn;
                            var relName = _b[0], val = _b[1];
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        _c = joins[relName], joinTable = _c.joinTable, localJoinColumn = _c.localJoinColumn, foreignJoinColumn = _c.foreignJoinColumn;
                                        return [4 /*yield*/, Promise.all(val.map(function (v) {
                                                return db.query("\n\t\t\t\t\t\t\tINSERT INTO ".concat(joinTable, "\n\t\t\t\t\t\t\t(").concat(localJoinColumn, ", ").concat(foreignJoinColumn, ")\n\t\t\t\t\t\t\tVALUES ($1, $2)\n\t\t\t\t\t\t\tON CONFLICT DO NOTHING\n\t\t\t"), [created[idAttribute], v.id]);
                                            }))];
                                    case 1:
                                        _d.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 3:
                    _f.sent();
                    return [2 /*return*/, {
                            type: resource.type,
                            id: created[idAttribute],
                            attributes: (0, lodash_es_1.pick)(created, Object.keys(resSchema.attributes)),
                            relationships: (_e = resource.relationships) !== null && _e !== void 0 ? _e : {},
                        }];
            }
        });
    });
}
