"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.columnTypeModifiers = void 0;
exports.columnTypeModifiers = {
    geojson: {
        extract: function (val) { return JSON.parse(val); },
        select: function (val) { return "ST_AsGeoJSON(".concat(val, ")"); },
    },
};
