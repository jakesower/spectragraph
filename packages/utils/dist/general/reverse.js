"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.reverse = reverse;

function reverse(items) {
  var output = [];

  for (var i = items.length - 1; i >= 0; i -= 1) {
    output.push(items[i]);
  }

  return output;
}

;