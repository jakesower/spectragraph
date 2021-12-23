"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reverse = void 0;
function reverse(items) {
    const output = [];
    for (let i = (items.length - 1); i >= 0; i -= 1) {
        output.push(items[i]);
    }
    return output;
}
exports.reverse = reverse;
;
