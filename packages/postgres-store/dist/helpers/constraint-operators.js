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
Object.defineProperty(exports, "__esModule", { value: true });
exports.constraintOperators = void 0;
var lodash_es_1 = require("lodash-es");
var comparative = function (sqlOperator) { return ({
    compile: function (exprVal, compile) { return function () {
        var _a, _b, _c, _d;
        var _e = exprVal.map(function (v) { return compile(v)(); }), left = _e[0], right = _e[1];
        return {
            where: ["".concat((_a = left === null || left === void 0 ? void 0 : left.where) !== null && _a !== void 0 ? _a : "?", " ").concat(sqlOperator, " ").concat((_b = right === null || right === void 0 ? void 0 : right.where) !== null && _b !== void 0 ? _b : "?")],
            vars: __spreadArray(__spreadArray([], ((_c = left === null || left === void 0 ? void 0 : left.vars) !== null && _c !== void 0 ? _c : [left]), true), ((_d = right === null || right === void 0 ? void 0 : right.vars) !== null && _d !== void 0 ? _d : [right]), true),
        };
    }; },
}); };
var constraintOperatorDefs = {
    $and: {
        compile: function (exprVal, compile) { return function () {
            var predicates = exprVal.map(function (val) { return compile(val)(); });
            var wheres = predicates.map(function (pred) { return pred.where; }).filter(Boolean);
            if (wheres.length === 0)
                return {};
            return {
                where: [
                    "(".concat(predicates
                        .map(function (pred) { return pred.where; })
                        .filter(Boolean)
                        .join(") AND ("), ")"),
                ],
                vars: predicates.flatMap(function (pred) { var _a; return (_a = pred.vars) !== null && _a !== void 0 ? _a : []; }),
            };
        }; },
    },
    $prop: {
        compile: function (exprVal, _, _a) {
            var query = _a.query, schema = _a.schema;
            if (!(exprVal in schema.resources[query.type].properties)) {
                throw new Error("invalid property");
            }
            return function () { return ({
                where: exprVal,
                vars: [],
            }); };
        },
    },
    // comparative
    $eq: comparative("="),
    $gt: comparative(">"),
    $gte: comparative(">="),
    $lt: comparative("<"),
    $lte: comparative("<="),
    $ne: comparative("!="),
    $in: {
        compile: function (args, compile) { return function (vars) {
            var item = args[0], array = args[1];
            var itemVal = compile(item)(vars);
            var arrayVals = array.map(function (arg) { return compile(arg)(vars); });
            if (array.length === 0)
                return {};
            return {
                where: "".concat(itemVal.where, " IN (").concat(arrayVals.map(function () { return "?"; }).join(", "), ")"),
                vars: arrayVals,
            };
        }; },
    },
    $nin: {
        compile: function (args, compile) { return function (vars) {
            var item = args[0], array = args[1];
            var itemVal = compile(item)(vars);
            var arrayVals = array.map(function (arg) { return compile(arg)(vars); });
            if (array.length === 0)
                return {};
            return {
                where: "".concat(itemVal.where, " NOT IN (").concat(arrayVals.map(function () { return "?"; }).join(", "), ")"),
                vars: arrayVals,
            };
        }; },
    },
};
exports.constraintOperators = (0, lodash_es_1.mapValues)(constraintOperatorDefs, function (def) { return (__assign(__assign({}, def), { preQuery: true })); });
