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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRequest = parseRequest;
var expressions_1 = require("@data-prism/expressions");
var json5_1 = __importDefault(require("json5"));
var lodash_es_1 = require("lodash-es");
var casters = {
    boolean: function (x) { return x === "true"; },
    number: function (x) { return Number(x); },
    integer: function (x) { return Number(x); },
};
var castFilterValue = function (type, val) {
    if (!casters[type])
        return val;
    var parsed = typeof val === "string" && val.match(/^\[.*\]$/)
        ? val.slice(1, -1).split(",")
        : val;
    return Array.isArray(parsed)
        ? parsed.map(casters[type])
        : typeof val === "object"
            ? (0, lodash_es_1.mapValues)(val, function (v) { return castFilterValue(type, v); })
            : casters[type](val);
};
function parseRequest(schema, params) {
    var _a, _b;
    var parsedInclude = (_b = (_a = params.include) === null || _a === void 0 ? void 0 : _a.split(",")) !== null && _b !== void 0 ? _b : [];
    var go = function (type, path) {
        var _a, _b;
        if (path === void 0) { path = []; }
        var id = params.id, fields = params.fields, filter = params.filter, sort = params.sort, page = params.page;
        var resDef = schema.resources[type];
        var relevantFilters = (0, lodash_es_1.pickBy)(filter !== null && filter !== void 0 ? filter : {}, function (f, k) {
            return (path.length === 0 && !k.includes(".")) ||
                (k.startsWith("".concat(path.join("."), ".")) &&
                    !k.split("".concat(path.join("."), "."))[1].includes("."));
        });
        var parsedFilters = {};
        Object.entries(relevantFilters).forEach(function (_a) {
            var key = _a[0], val = _a[1];
            parsedFilters[path.length === 0 ? key : key.split("".concat(path.join("."), "."))[1]] = val;
        });
        var castFilters = (0, lodash_es_1.mapValues)(parsedFilters, function (param, key) {
            var attrType = resDef.attributes[key].type;
            if (expressions_1.defaultExpressionEngine.isExpression(param))
                return castFilterValue(attrType, param);
            try {
                var parsed = json5_1.default.parse(param);
                if (expressions_1.defaultExpressionEngine.isExpression(parsed))
                    return castFilterValue(attrType, parsed);
            }
            catch (_a) {
                // noop
            }
            return castFilterValue(attrType, param);
        });
        var included = parsedInclude
            .filter(function (i) {
            return (path.length === 0 && !i.includes(".")) ||
                (i.startsWith("".concat(path.join("."), ".")) &&
                    !i.split("".concat(path.join("."), "."))[1].includes("."));
        })
            .map(function (i) { return (path.length === 0 ? i : i.split("".concat(path.join("."), "."))[1]); });
        var select = __spreadArray(__spreadArray([], ((fields === null || fields === void 0 ? void 0 : fields[type])
            ? (0, lodash_es_1.uniq)(__spreadArray(__spreadArray(__spreadArray([], fields[type].split(","), true), [
                (_a = resDef.idAttribute) !== null && _a !== void 0 ? _a : "id"
            ], false), Object.keys(parsedFilters !== null && parsedFilters !== void 0 ? parsedFilters : {}), true))
            : Object.keys(resDef.attributes)), true), included.map(function (related) {
            var _a;
            return (_a = {},
                _a[related] = go(resDef.relationships[related].type, __spreadArray(__spreadArray([], path, true), [related], false)),
                _a);
        }), true);
        var order = sort && path.length === 0
            ? sort.split(",").map(function (field) {
                var _a;
                var parsedField = field[0] === "-" ? field.slice(1) : field;
                if (!Object.keys(resDef.attributes).includes(parsedField)) {
                    throw new Error("".concat(parsedField, " is not a valid attribute of ").concat(type));
                }
                return _a = {}, _a[parsedField] = field[0] === "-" ? "desc" : "asc", _a;
            })
            : null;
        var limit = (page === null || page === void 0 ? void 0 : page.size) ? Number(page.size) : null;
        var offset = (page === null || page === void 0 ? void 0 : page.number)
            ? (Number(page.number) - 1) * Number((_b = page === null || page === void 0 ? void 0 : page.size) !== null && _b !== void 0 ? _b : 1)
            : null;
        return __assign(__assign(__assign(__assign(__assign(__assign(__assign({}, (path.length === 0 ? { type: type } : {})), (path.length === 0 && id ? { id: id } : {})), { select: select }), (Object.keys(relevantFilters).length > 0
            ? { where: castFilters }
            : {})), (order ? { order: order } : {})), (limit ? { limit: limit } : {})), (offset ? { offset: offset } : {}));
    };
    return go(params.type);
}
