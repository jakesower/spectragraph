"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.pipe = pipe;

function pipe(fns) {
  return fns.reduce(function (acc, fn) {
    return function (val) {
      return fn(acc(val));
    };
  }, function (x) {
    return x;
  });
}