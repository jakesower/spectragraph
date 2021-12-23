"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.difference = void 0;
function difference(left, right) {
    const rightSet = new Set(right);
    return left.filter((leftElt) => !rightSet.has(leftElt));
}
exports.difference = difference;
