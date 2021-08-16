"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// export function transduce<A, B, C, D>(items: A[], transducers: Transducer<any, any, any, any>[]): any {
function transduce(items, transducers) {
    const reversedTransducers = [...transducers];
    reversedTransducers.reverse();
    // mutating output is much faster than returning with a spread
    let output = [];
    const transFn = reversedTransducers.reduce((accum, transducer) => (item) => transducer(item, accum, output), (item) => output[output.length] = item);
    // const transFn = reversedTransducers.reduce(
    //   (accum, transducer) => item => transducer(item, accum, output),
    //   (item, next, output) => output.push(item)
    // )
    items.forEach(transFn);
    return output;
}
exports.transduce = transduce;
