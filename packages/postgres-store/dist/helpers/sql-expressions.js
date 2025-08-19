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
exports.varsExpressionEngine = exports.whereExpressionEngine = void 0;
var expressions_1 = require("@data-prism/expressions");
var lodash_es_1 = require("lodash-es");
var sqlExpressions = {
    $and: {
        name: "and",
        where: function (params) { return params.join(" AND "); },
        vars: function (params) { return params.flat(); },
    },
    $eq: {
        name: "equal",
        where: function (params) { return "".concat(params[0], " = ?"); },
        vars: function (params) { return params[1]; },
    },
    $gt: {
        name: "greater than",
        where: function (params) { return "".concat(params[0], " > ?"); },
        vars: function (params) { return params[1]; },
    },
    $gte: {
        name: "greater than or equal to",
        where: function (params) { return "".concat(params[0], " >= ?"); },
        vars: function (params) { return params[1]; },
    },
    $lt: {
        name: "less than",
        where: function (params) { return "".concat(params[0], " < ?"); },
        vars: function (params) { return params[1]; },
    },
    $lte: {
        name: "less than or equal to",
        where: function (params) { return "".concat(params[0], " <= ?"); },
        vars: function (params) { return params[1]; },
    },
    $ne: {
        name: "not equal",
        where: function (params) { return "".concat(params[0], " != ?"); },
        vars: function (params) { return params[1]; },
    },
    $in: {
        name: "contained in",
        where: function (params) {
            return "".concat(params[0], " IN (").concat(params[1].map(function () { return "?"; }).join(","), ")");
        },
        vars: function (params) { return params[1]; },
    },
    $nin: {
        name: "not contained in",
        where: function (params) {
            return "".concat(params[0], " NOT IN (").concat(params[1].map(function () { return "?"; }).join(","), ")");
        },
        vars: function (params) { return params[1]; },
    },
    $or: {
        // TODO
        name: "or",
        controlsEvaluation: true,
        where: function (params, evaluate) {
            console.log("args", params.map(evaluate));
        },
        vars: function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            console.log("Var args", args);
        },
    },
};
exports.whereExpressionEngine = (0, expressions_1.createExpressionEngine)((0, lodash_es_1.mapValues)(sqlExpressions, function (expr) { return (__assign(__assign({}, expr), { evaluate: expr.where })); }));
exports.varsExpressionEngine = (0, expressions_1.createExpressionEngine)((0, lodash_es_1.mapValues)(sqlExpressions, function (expr) { return (__assign(__assign({}, expr), { evaluate: expr.vars })); }));
