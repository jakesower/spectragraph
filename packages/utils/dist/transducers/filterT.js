"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function filterT(predicateFn) {
    return (val, next) => {
        if (predicateFn(val))
            return next(val);
    };
}
exports.filterT = filterT;
