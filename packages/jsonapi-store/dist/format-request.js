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
exports.formatRequest = formatRequest;
var data_prism_1 = require("data-prism");
var lodash_es_1 = require("lodash-es");
var objectToParamStr = function (obj, rootKey) {
    var go = function (cur) {
        return Object.entries(cur).flatMap(function (_a) {
            var k = _a[0], v = _a[1];
            return Array.isArray(v)
                ? "[".concat(k, "]=[").concat(v.join(","), "]")
                : typeof v === "object"
                    ? "[".concat(k, "]").concat(go(v))
                    : "[".concat(k, "]=").concat(v);
        });
    };
    return go(obj)
        .map(function (x) { return "".concat(rootKey).concat(x); })
        .join("&");
};
function formatRequest(schema, config, query) {
    var normalizedQuery = (0, data_prism_1.normalizeQuery)(query);
    var fields = {};
    var include = [];
    var filters = {};
    // fields and where/filter
    (0, data_prism_1.forEachQuery)(schema, query, function (subquery, info) {
        var _a;
        if (info.parent) {
            include.push(info.path.join("."));
        }
        fields[info.type] = __spreadArray(__spreadArray([], ((_a = fields[info.type]) !== null && _a !== void 0 ? _a : []), true), info.attributes, true);
        if (subquery.where) {
            Object.entries(subquery.where).forEach(function (_a) {
                var field = _a[0], filter = _a[1];
                var k = __spreadArray(__spreadArray([], info.path, true), [field], false).join(".");
                filters[k] = filter;
            });
        }
    });
    var fieldsStr = Object.entries(fields)
        .map(function (_a) {
        var type = _a[0], vals = _a[1];
        return "fields[".concat(type, "]=").concat((0, lodash_es_1.uniq)(vals).join(","));
    })
        .join("&");
    var includeStr = include.length > 0 && "include=".concat(include.join(","));
    var sortStr = query.order &&
        "sort=".concat(normalizedQuery.order
            .map(function (q) {
            return Object.entries(q).map(function (_a) {
                var attr = _a[0], dir = _a[1];
                return dir === "asc" ? attr : "-".concat(attr);
            });
        })
            .join(","));
    var limit = query.limit, _a = query.offset, offset = _a === void 0 ? 0 : _a;
    var pageStr = limit &&
        objectToParamStr({
            number: Math.floor(offset / limit) + 1,
            size: limit + (offset % limit),
        }, "page");
    var filterStr = Object.keys(filters).length > 0 && objectToParamStr(filters, "filter");
    var paramStr = [fieldsStr, includeStr, sortStr, pageStr, filterStr]
        .filter(Boolean)
        .join("&");
    var path = "".concat(query.type).concat(query.id ? "/".concat(query.id) : "");
    return "".concat(config.baseURL, "/").concat(path, "?").concat(paramStr);
}
