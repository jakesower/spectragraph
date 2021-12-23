"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lazy = void 0;
function lazy(fn) {
    let output;
    let processed = false;
    return () => {
        if (!processed) {
            output = fn();
            processed = true;
        }
        return output;
    };
}
exports.lazy = lazy;
