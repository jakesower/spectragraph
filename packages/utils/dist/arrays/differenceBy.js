"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.differenceBy = void 0;
function differenceBy(left, right, fn) {
    const rightSet = new Set(right.map(fn));
    return left.filter((leftElt) => !rightSet.has(fn(leftElt)));
}
exports.differenceBy = differenceBy;
