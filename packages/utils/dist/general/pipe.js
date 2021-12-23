"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pipe = void 0;
function pipe(fns) {
    return fns.reduce((acc, fn) => (val) => fn(acc(val)), (x) => x);
}
exports.pipe = pipe;
