"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function pipe(fns) {
    return fns.reduce((acc, fn) => (val) => fn(acc(val)), (x) => x);
}
exports.pipe = pipe;
