"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.combinations = combinations;
exports.combinationsBy = combinationsBy;
exports.difference = difference;
exports.equal = equal;
exports.union = union;

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

// note that compareFn must be injective
function combinations(left, right) {
  var leftArray = _toConsumableArray(left);

  var rightArray = _toConsumableArray(right);

  var leftOnly = new Set();
  var _ref = [leftArray.length, rightArray.length],
      numLeft = _ref[0],
      numRight = _ref[1];
  var rightOnly = new Set();
  var intersection = new Set();
  var union = new Set();

  for (var i = 0; i < numLeft; i += 1) {
    leftOnly.add(leftArray[i]);
    union.add(leftArray[i]);
  }

  for (var _i = 0; _i < numRight; _i += 1) {
    var rightItem = rightArray[_i];

    if (leftOnly.has(rightItem)) {
      leftOnly["delete"](rightItem);
      intersection.add(rightItem);
    } else {
      rightOnly.add(rightItem);
      union.add(rightItem);
    }
  }

  return {
    left: left,
    right: right,
    leftOnly: leftOnly,
    rightOnly: rightOnly,
    intersection: intersection,
    union: union
  };
} // note that compareFn must be injective


function combinationsBy(left, right, compareFn) {
  var leftOnlyMap = new Map();
  var _ref2 = [left.length, right.length],
      numLeft = _ref2[0],
      numRight = _ref2[1];
  var rightOnly = [];
  var intersection = [];
  var union = [];

  for (var i = 0; i < numLeft; i += 1) {
    leftOnlyMap.set(compareFn(left[i]), left[i]);
    union.push(left[i]);
  }

  for (var _i2 = 0; _i2 < numRight; _i2 += 1) {
    var item = right[_i2];
    var rightComp = compareFn(item);

    if (leftOnlyMap.has(rightComp)) {
      leftOnlyMap["delete"](rightComp);
      intersection.push(item);
    } else {
      rightOnly.push(item);
      union.push(item);
    }
  }

  return {
    left: left,
    right: right,
    leftOnly: Array.from(leftOnlyMap.values()),
    rightOnly: rightOnly,
    intersection: intersection,
    union: union
  };
}

function difference(left, right) {
  return new Set(Array.from(left).filter(function (leftElt) {
    return !right.has(leftElt);
  }));
}

function equal(left, right) {
  return left.size === right.size && _toConsumableArray(left).every(function (l) {
    return right.has(l);
  });
}

function union(left, right) {
  return new Set(_toConsumableArray(left).concat([_toConsumableArray(right)]));
}