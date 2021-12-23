"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.difference = void 0;
function difference(left, right) {
    return new Set(Array.from(left).filter((leftElt) => !right.has(leftElt)));
}
exports.difference = difference;
