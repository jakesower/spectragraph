"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function pick(obj, keys) {
    const l = keys.length;
    let out = {};
    for (let i = 0; i < l; i += 1) {
        if (keys[i] in obj) {
            out[keys[i]] = obj[keys[i]];
        }
    }
    return out;
}
exports.pick = pick;
