"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.pick = pick;

function pick(obj, keys) {
  var l = keys.length;
  var out = {};

  for (var i = 0; i < l; i += 1) {
    if (keys[i] in obj) {
      out[keys[i]] = obj[keys[i]];
    }
  }

  return out;
}