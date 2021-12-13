"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function intersection(leftArray, rightArray) {
    const output = [];
    const [smallerArray, largerArrayAsSet] = leftArray.length < rightArray.length
        ? [leftArray, new Set(rightArray)]
        : [rightArray, new Set(leftArray)];
    const l = smallerArray.length;
    for (let i = 0; i < l; i += 1) {
        const item = smallerArray[i];
        if (largerArrayAsSet.has(item)) {
            output[output.length] = item;
        }
    }
    return output;
}
exports.intersection = intersection;
;
