"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoize1 = void 0;
const init = Symbol('init');
function memoize1(fn) {
    let cachedArg = [init];
    let cachedVal;
    return (...args) => {
        if (args !== cachedArg) {
            cachedArg = args;
            cachedVal = fn(...args);
        }
        return cachedVal;
    };
}
exports.memoize1 = memoize1;
