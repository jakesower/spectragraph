"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// export function mapT<T, U>((fn: (val: T) => U) => ((next) => U)) {
function mapT(fn) {
    return (val, next) => next(fn(val));
}
exports.mapT = mapT;
