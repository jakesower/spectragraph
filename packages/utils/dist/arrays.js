"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.asArray = asArray;
exports.difference = difference;
exports.differenceBy = differenceBy;
exports.groupBy = groupBy;
exports.intersection = intersection;
exports.intersperse = intersperse;
exports.keyBy = keyBy;
exports.last = last;
exports.multiApply = multiApply;
exports.partition = partition;
exports.reduceChunks = reduceChunks;
exports.reduceChunksWithInit = reduceChunksWithInit;
exports.reverse = reverse;
exports.sortBy = sortBy;
exports.splitAt = splitAt;
exports.takeWhile = takeWhile;
exports.transpose = transpose;
exports.uniq = uniq;
exports.uniqBy = uniqBy;
exports.zipObj = zipObj;
exports.zipObjWith = zipObjWith;

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e2) { throw _e2; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e3) { didErr = true; err = _e3; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _toArray(arr) { return _arrayWithHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableRest(); }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function asArray(maybeArray) {
  return !maybeArray ? [] : Array.isArray(maybeArray) ? _toConsumableArray(maybeArray) : [maybeArray];
}

function difference(left, right) {
  var rightSet = new Set(right);
  return left.filter(function (leftElt) {
    return !rightSet.has(leftElt);
  });
}

function differenceBy(left, right, fn) {
  var rightSet = new Set(right.map(fn));
  return left.filter(function (leftElt) {
    return !rightSet.has(fn(leftElt));
  });
}

function intersection(leftArray, rightArray) {
  var output = [];

  var _ref = leftArray.length < rightArray.length ? [leftArray, new Set(rightArray)] : [rightArray, new Set(leftArray)],
      _ref2 = _slicedToArray(_ref, 2),
      smallerArray = _ref2[0],
      largerArrayAsSet = _ref2[1];

  var l = smallerArray.length;

  for (var i = 0; i < l; i += 1) {
    var item = smallerArray[i];

    if (largerArrayAsSet.has(item)) {
      output[output.length] = item;
    }
  }

  return output;
}

function intersperse(items, interItem) {
  if (items.length <= 1) return items;
  var output = [items[0]];

  for (var i = 1; i < items.length; i += 1) {
    output.push(interItem);
    output.push(items[i]);
  }

  return output;
}

function groupBy(items, fn) {
  var out = {};
  var l = items.length;

  for (var i = 0; i < l; i += 1) {
    var group = fn(items[i]);
    out[group] = out[group] || [];
    out[group][out[group].length] = items[i];
  }

  return out;
}

function keyBy(items, fn) {
  var output = {};
  var l = items.length;

  for (var i = 0; i < l; i += 1) {
    output[fn(items[i])] = items[i];
  }

  return output;
}

function last(items) {
  return items[items.length - 1];
}

function multiApply(itemItemsOrNull, fn) {
  if (itemItemsOrNull == null) return itemItemsOrNull;
  return Array.isArray(itemItemsOrNull) ? itemItemsOrNull.map(fn) : fn(itemItemsOrNull);
}

function partition(items, predicateFn) {
  var l = items.length;
  var outTrue = [];
  var outFalse = [];

  for (var i = 0; i < l; i += 1) {
    if (predicateFn(items[i])) {
      outTrue[outTrue.length] = items[i];
    } else {
      outFalse[outFalse.length] = items[i];
    }
  }

  return [outTrue, outFalse];
}

function reduceChunks(items, chunkSize, fn) {
  var out = items.slice(chunkSize);

  for (var i = chunkSize; i < items.length; i += chunkSize) {
    out = fn(out, items.slice(i, chunkSize + i));
  }

  return out;
}

function reduceChunksWithInit(items, init, chunkSize, fn) {
  var out = init;

  for (var i = 0; i < items.length; i += chunkSize) {
    out = fn(out, items.slice(i, chunkSize + i));
  }

  return out;
}

function reverse(items) {
  var output = [];

  for (var i = items.length - 1; i >= 0; i -= 1) {
    output.push(items[i]);
  }

  return output;
}

function sortBy(xs, fn) {
  if (xs.length === 0) {
    return [];
  }

  var _xs = _toArray(xs),
      first = _xs[0],
      rest = _xs.slice(1);

  var lts = [];
  var gts = [];
  var eqs = [first];

  for (var i = 0; i < rest.length; i += 1) {
    var comp = fn(rest[i], first);

    if (comp > 0) {
      gts.push(rest[i]);
    } else if (comp === 0) {
      eqs.push(rest[i]);
    } else {
      lts.push(rest[i]);
    }
  }

  return sortBy(lts, fn).concat(eqs).concat(sortBy(gts, fn));
}

function splitAt(items, idx) {
  return [items.slice(0, idx), items.slice(idx)];
}

function takeWhile(items, predicateFn) {
  var output = [];

  for (var i = 0; i < items.length; i += 1) {
    if (predicateFn(items[i])) {
      output.push(items[i]);
    } else {
      return output;
    }
  }

  return output;
}

function transpose(items) {
  var out = [[]];

  for (var i = 0; i < items.length; i += 1) {
    for (var j = 0; j < items[i].length; j += 1) {
      if (!out[j]) out[j] = [];
      out[j][i] = items[i][j];
    }
  }

  return out;
}

function uniq(items) {
  return _toConsumableArray(new Set(items));
}

function uniqBy(items, fn) {
  var hits = new Set();
  var out = [];

  var _iterator = _createForOfIteratorHelper(items),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var item = _step.value;
      var key = fn(item);

      if (!hits.has(key)) {
        hits.add(key);
        out[out.length] = item;
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  return out;
}

function zipObj(keys, vals) {
  return keys.reduce(function (out, key, idx) {
    var o = _defineProperty({}, key, vals[idx]);

    return _objectSpread(_objectSpread({}, out), o);
  }, {});
}

function zipObjWith(keys, vals, fn) {
  return keys.reduce(function (out, key, idx) {
    var o = _defineProperty({}, key, fn(vals[idx], key));

    return _objectSpread(_objectSpread({}, out), o);
  }, {});
}