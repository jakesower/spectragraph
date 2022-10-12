"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.appendKeys = appendKeys;
exports.applyOrMap = applyOrMap;
exports.arraySetDifference = arraySetDifference;
exports.arraySetDifferenceBy = arraySetDifferenceBy;
exports.arrayUnion = arrayUnion;
exports.assignChildren = assignChildren;
exports.chainPipeThru = chainPipeThru;
exports.cmp = cmp;
Object.defineProperty(exports, "combineObjs", {
  enumerable: true,
  get: function get() {
    return _combineObjs.combineObjs;
  }
});
exports.deepClone = deepClone;
Object.defineProperty(exports, "equals", {
  enumerable: true,
  get: function get() {
    return _deepEqual.default;
  }
});
exports.fgo = fgo;
exports.fillObject = fillObject;
Object.defineProperty(exports, "filterObj", {
  enumerable: true,
  get: function get() {
    return _filterObj.filterObj;
  }
});
exports.findObj = findObj;
exports.flatMap = flatMap;
exports.flatten = flatten;
exports.forEachObj = forEachObj;
exports.groupBy = groupBy;
exports.indexOn = indexOn;
exports.inlineKey = inlineKey;
exports.keyBy = keyBy;
Object.defineProperty(exports, "mapObj", {
  enumerable: true,
  get: function get() {
    return _mapObj.mapObj;
  }
});
exports.mapObjToArray = mapObjToArray;
exports.mapResult = mapResult;
exports.maxStable = maxStable;
exports.mergeAll = mergeAll;
exports.mergeChildren = mergeChildren;
exports.mergeWith = mergeWith;
Object.defineProperty(exports, "objPromise", {
  enumerable: true,
  get: function get() {
    return _objPromise.objPromise;
  }
});
exports.omit = omit;
exports.parseQueryParams = parseQueryParams;
exports.partition = partition;
exports.pathOr = pathOr;
Object.defineProperty(exports, "pick", {
  enumerable: true,
  get: function get() {
    return _pick.pick;
  }
});
Object.defineProperty(exports, "pipe", {
  enumerable: true,
  get: function get() {
    return _pipe.pipe;
  }
});
exports.pipeMw = pipeMw;
exports.pipeThru = pipeThru;
Object.defineProperty(exports, "pipeThruMiddleware", {
  enumerable: true,
  get: function get() {
    return _pipeThruMiddleware.pipeThruMiddleware;
  }
});
Object.defineProperty(exports, "pipeThruMiddlewareDebug", {
  enumerable: true,
  get: function get() {
    return _pipeThruMiddleware.pipeThruMiddlewareDebug;
  }
});
Object.defineProperty(exports, "pipeWithContext", {
  enumerable: true,
  get: function get() {
    return _pipeWithContext.pipeWithContext;
  }
});
exports.pluckKeys = pluckKeys;
exports.reduceObj = reduceObj;
Object.defineProperty(exports, "reverse", {
  enumerable: true,
  get: function get() {
    return _reverse.reverse;
  }
});
exports.sortBy = sortBy;
exports.sortByAll = sortByAll;
exports.sortWith = sortWith;
exports.sortWithAll = sortWithAll;
Object.defineProperty(exports, "tap", {
  enumerable: true,
  get: function get() {
    return _tap.tap;
  }
});
exports.union = union;
exports.uniq = uniq;
exports.uniqBy = uniqBy;
exports.unnest = unnest;
exports.xprod = xprod;
exports.zipObj = zipObj;

var _deepEqual = _interopRequireDefault(require("deep-equal"));

var _mapObj = require("./general/mapObj.js");

var _pipe = require("./general/pipe.js");

var _combineObjs = require("./general/combineObjs.js");

var _filterObj = require("./general/filterObj.js");

var _objPromise = require("./general/objPromise.js");

var _pick = require("./general/pick.js");

var _pipeThruMiddleware = require("./general/pipeThruMiddleware.js");

var _pipeWithContext = require("./general/pipeWithContext.js");

var _reverse = require("./general/reverse.js");

var _tap = require("./general/tap.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return exports; }; var exports = {}, Op = Object.prototype, hasOwn = Op.hasOwnProperty, $Symbol = "function" == typeof Symbol ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag"; function define(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: !0, configurable: !0, writable: !0 }), obj[key]; } try { define({}, ""); } catch (err) { define = function define(obj, key, value) { return obj[key] = value; }; } function wrap(innerFn, outerFn, self, tryLocsList) { var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []); return generator._invoke = function (innerFn, self, context) { var state = "suspendedStart"; return function (method, arg) { if ("executing" === state) throw new Error("Generator is already running"); if ("completed" === state) { if ("throw" === method) throw arg; return doneResult(); } for (context.method = method, context.arg = arg;;) { var delegate = context.delegate; if (delegate) { var delegateResult = maybeInvokeDelegate(delegate, context); if (delegateResult) { if (delegateResult === ContinueSentinel) continue; return delegateResult; } } if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) { if ("suspendedStart" === state) throw state = "completed", context.arg; context.dispatchException(context.arg); } else "return" === context.method && context.abrupt("return", context.arg); state = "executing"; var record = tryCatch(innerFn, self, context); if ("normal" === record.type) { if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue; return { value: record.arg, done: context.done }; } "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg); } }; }(innerFn, self, context), generator; } function tryCatch(fn, obj, arg) { try { return { type: "normal", arg: fn.call(obj, arg) }; } catch (err) { return { type: "throw", arg: err }; } } exports.wrap = wrap; var ContinueSentinel = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var IteratorPrototype = {}; define(IteratorPrototype, iteratorSymbol, function () { return this; }); var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([]))); NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype); var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype); function defineIteratorMethods(prototype) { ["next", "throw", "return"].forEach(function (method) { define(prototype, method, function (arg) { return this._invoke(method, arg); }); }); } function AsyncIterator(generator, PromiseImpl) { function invoke(method, arg, resolve, reject) { var record = tryCatch(generator[method], generator, arg); if ("throw" !== record.type) { var result = record.arg, value = result.value; return value && "object" == _typeof(value) && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) { invoke("next", value, resolve, reject); }, function (err) { invoke("throw", err, resolve, reject); }) : PromiseImpl.resolve(value).then(function (unwrapped) { result.value = unwrapped, resolve(result); }, function (error) { return invoke("throw", error, resolve, reject); }); } reject(record.arg); } var previousPromise; this._invoke = function (method, arg) { function callInvokeWithMethodAndArg() { return new PromiseImpl(function (resolve, reject) { invoke(method, arg, resolve, reject); }); } return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); }; } function maybeInvokeDelegate(delegate, context) { var method = delegate.iterator[context.method]; if (undefined === method) { if (context.delegate = null, "throw" === context.method) { if (delegate.iterator.return && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method)) return ContinueSentinel; context.method = "throw", context.arg = new TypeError("The iterator does not provide a 'throw' method"); } return ContinueSentinel; } var record = tryCatch(method, delegate.iterator, context.arg); if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel; var info = record.arg; return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel); } function pushTryEntry(locs) { var entry = { tryLoc: locs[0] }; 1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry); } function resetTryEntry(entry) { var record = entry.completion || {}; record.type = "normal", delete record.arg, entry.completion = record; } function Context(tryLocsList) { this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0); } function values(iterable) { if (iterable) { var iteratorMethod = iterable[iteratorSymbol]; if (iteratorMethod) return iteratorMethod.call(iterable); if ("function" == typeof iterable.next) return iterable; if (!isNaN(iterable.length)) { var i = -1, next = function next() { for (; ++i < iterable.length;) { if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next; } return next.value = undefined, next.done = !0, next; }; return next.next = next; } } return { next: doneResult }; } function doneResult() { return { value: undefined, done: !0 }; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, define(Gp, "constructor", GeneratorFunctionPrototype), define(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) { var ctor = "function" == typeof genFun && genFun.constructor; return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name)); }, exports.mark = function (genFun) { return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun; }, exports.awrap = function (arg) { return { __await: arg }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () { return this; }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) { void 0 === PromiseImpl && (PromiseImpl = Promise); var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl); return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) { return result.done ? result.value : iter.next(); }); }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () { return this; }), define(Gp, "toString", function () { return "[object Generator]"; }), exports.keys = function (object) { var keys = []; for (var key in object) { keys.push(key); } return keys.reverse(), function next() { for (; keys.length;) { var key = keys.pop(); if (key in object) return next.value = key, next.done = !1, next; } return next.done = !0, next; }; }, exports.values = values, Context.prototype = { constructor: Context, reset: function reset(skipTempReset) { if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) { "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined); } }, stop: function stop() { this.done = !0; var rootRecord = this.tryEntries[0].completion; if ("throw" === rootRecord.type) throw rootRecord.arg; return this.rval; }, dispatchException: function dispatchException(exception) { if (this.done) throw exception; var context = this; function handle(loc, caught) { return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught; } for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i], record = entry.completion; if ("root" === entry.tryLoc) return handle("end"); if (entry.tryLoc <= this.prev) { var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc"); if (hasCatch && hasFinally) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } else if (hasCatch) { if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0); } else { if (!hasFinally) throw new Error("try statement without catch or finally"); if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc); } } } }, abrupt: function abrupt(type, arg) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) { var finallyEntry = entry; break; } } finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null); var record = finallyEntry ? finallyEntry.completion : {}; return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record); }, complete: function complete(record, afterLoc) { if ("throw" === record.type) throw record.arg; return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel; }, finish: function finish(finallyLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel; } }, catch: function _catch(tryLoc) { for (var i = this.tryEntries.length - 1; i >= 0; --i) { var entry = this.tryEntries[i]; if (entry.tryLoc === tryLoc) { var record = entry.completion; if ("throw" === record.type) { var thrown = record.arg; resetTryEntry(entry); } return thrown; } } throw new Error("illegal catch attempt"); }, delegateYield: function delegateYield(iterable, resultName, nextLoc) { return this.delegate = { iterator: values(iterable), resultName: resultName, nextLoc: nextLoc }, "next" === this.method && (this.arg = undefined), ContinueSentinel; } }, exports; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toArray(arr) { return _arrayWithHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function appendKeys(base, other) {
  var keys = uniq([].concat(_toConsumableArray(Object.keys(base)), _toConsumableArray(Object.keys(other))));
  var result = {};

  var _iterator = _createForOfIteratorHelper(keys),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var key = _step.value;
      result[key] = [].concat(_toConsumableArray(base[key] || []), _toConsumableArray(other[key] || []));
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  return result;
}

function applyOrMap(valueOrArray, fn) {
  if (Array.isArray(valueOrArray)) {
    return valueOrArray.map(fn);
  }

  return fn(valueOrArray);
}

function arraySetDifference(xs, ys) {
  var ySet = new Set(ys);
  return xs.filter(function (x) {
    return !ySet.has(x);
  });
}

function arraySetDifferenceBy(xs, ys, fn) {
  var ySet = new Set(ys.map(fn));
  return xs.filter(function (x) {
    return !ySet.has(fn(x));
  });
}

function arrayUnion(xs, ys) {
  return _toConsumableArray(new Set([].concat(xs, ys)));
}

function assignChildren(objs) {
  var out = {};
  objs.forEach(function (obj) {
    for (var _i = 0, _Object$keys = Object.keys(obj); _i < _Object$keys.length; _i++) {
      var k = _Object$keys[_i];
      out[k] = obj[k];
    }
  });
  return out;
}

function chainPipeThru(val, fns) {
  return fns.reduce(function (acc, fn) {
    return acc.chain(fn);
  }, val);
}

function cmp(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function deepClone(obj) {
  if (!obj) {
    return obj;
  }

  var out = Array.isArray(obj) ? [] : {};

  for (var key in obj) {
    var val = obj[key];
    out[key] = _typeof(val) === "object" ? deepClone(val) : val;
  }

  return out;
}

function fgo(generator) {
  var recur = function recur(_ref, gen) {
    var value = _ref.value,
        done = _ref.done;

    if (done) {
      return value;
    }

    return value.chain(function (v) {
      return recur(gen.next(v), gen);
    });
  };

  var g = generator();
  return recur(g.next(), g);
}

function fillObject(keys, value) {
  var l = keys.length;
  var out = {};

  for (var i = 0; i < l; i += 1) {
    out[keys[i]] = value;
  }

  return out;
}

function findObj(obj, predicateFn) {
  for (var _i2 = 0, _Object$keys2 = Object.keys(obj); _i2 < _Object$keys2.length; _i2++) {
    var key = _Object$keys2[_i2];

    if (predicateFn(obj[key])) {
      return obj[key];
    }
  }

  return null;
}

function flatMap(xs, fn) {
  return makeFlat(xs.map(fn), false);
}

function forEachObj(obj, fn) {
  var keys = Object.keys(obj);
  var l = keys.length;

  for (var i = 0; i < l; i += 1) {
    var val = obj[keys[i]];
    fn(val, keys[i]);
  }
}

function flatten(xs) {
  return makeFlat(xs, true);
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

function indexOn(xs, keys) {
  var out = {};

  var _keys = _toArray(keys),
      first = _keys[0],
      rest = _keys.slice(1);

  if (rest.length === 0) {
    var _iterator2 = _createForOfIteratorHelper(xs),
        _step2;

    try {
      for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
        var x = _step2.value;
        out[x[first]] = x;
      }
    } catch (err) {
      _iterator2.e(err);
    } finally {
      _iterator2.f();
    }

    return out;
  }

  var _iterator3 = _createForOfIteratorHelper(xs),
      _step3;

  try {
    for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
      var _x = _step3.value;
      var k = _x[first];
      out[k] = out[k] || [];
      out[k][out[k].length] = _x;
    }
  } catch (err) {
    _iterator3.e(err);
  } finally {
    _iterator3.f();
  }

  return (0, _mapObj.mapObj)(out, function (ys) {
    return indexOn(ys, rest);
  });
} // e.g. {a: {inner: 'thing'}, b: {other: 'item'}} => {a: {key: 'a', inner: 'thing'}, b: {key: 'b', other: 'item'}}


function inlineKey(obj, keyProp) {
  var result = {};
  var keys = Object.keys(obj);

  for (var _i3 = 0, _keys2 = keys; _i3 < _keys2.length; _i3++) {
    var key = _keys2[_i3];
    result[key] = Object.assign({}, obj[key], _defineProperty({}, keyProp, key));
  }

  return result;
}

function keyBy(items, fn) {
  var output = {};
  var l = items.length;

  for (var i = 0; i < l; i += 1) {
    output[fn(items[i])] = items[i];
  }

  return output;
}

function mapObjToArray(obj, fn) {
  var _ref2 = [Object.keys(obj), Object.values(obj)],
      keys = _ref2[0],
      vals = _ref2[1];
  var mappedVals = vals.map(function (v, idx) {
    return fn(v, keys[idx]);
  });
  return mappedVals;
}

function maxStable(fn, xs) {
  var l = xs.length;
  var out = xs[0];
  var outVal = fn(out);

  for (var i = 1; i < l; i += 1) {
    var cur = xs[i];
    var curVal = fn(cur);

    if (curVal > outVal) {
      out = cur;
      outVal = curVal;
    }
  }

  return out;
}

function mapResult(resultOrResults, fn) {
  if (resultOrResults === null) {
    return null;
  }

  if (Array.isArray(resultOrResults)) {
    return resultOrResults.map(function (r) {
      return mapResult(r, fn);
    });
  }

  var next = fn(resultOrResults);
  var relationships = (0, _mapObj.mapObj)(resultOrResults.relationships, function (r) {
    return mapResult(r, fn);
  });
  return _objectSpread(_objectSpread({}, next), {}, {
    relationships: relationships
  });
}

function mergeAll(items) {
  var init = {};
  return items.reduce(function (merged, arg) {
    return _objectSpread(_objectSpread({}, merged), arg);
  }, init);
}

function mergeChildren(obj, ext) {
  var ks = uniq([].concat(_toConsumableArray(Object.keys(obj)), _toConsumableArray(Object.keys(ext))));
  var l = ks.length;
  var out = {};

  for (var i = 0; i < l; i += 1) {
    out[ks[i]] = _objectSpread(_objectSpread({}, obj[ks[i]] || {}), ext[ks[i]] || {});
  }

  return out;
}

function mergeWith(base, other, combiner) {
  var keys = uniq([].concat(_toConsumableArray(Object.keys(base)), _toConsumableArray(Object.keys(other))));
  var result = {};

  var _iterator4 = _createForOfIteratorHelper(keys),
      _step4;

  try {
    for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
      var key = _step4.value;
      result[key] = !(key in base) ? other[key] : !(key in other) ? base[key] : combiner(base[key], other[key]);
    }
  } catch (err) {
    _iterator4.e(err);
  } finally {
    _iterator4.f();
  }

  return result;
}

function omit(obj, keys) {
  var out = _objectSpread({}, obj);

  var _iterator5 = _createForOfIteratorHelper(keys),
      _step5;

  try {
    for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
      var key = _step5.value;
      delete out[key];
    }
  } catch (err) {
    _iterator5.e(err);
  } finally {
    _iterator5.f();
  }

  return out;
}

function parseQueryParams(rawParams) {
  var out = {};
  var indexRegex = /^([^[]+)\[([^\]]+)\]$/;
  Object.keys(rawParams).forEach(function (k) {
    var res = indexRegex.exec(k);

    if (res) {
      var _ref3 = [res[1], res[2]],
          top = _ref3[0],
          inner = _ref3[1];
      out[top] = out[top] || {};
      out[top][inner] = rawParams[k];
    } else {
      out[k] = rawParams[k];
    }
  });
  return out;
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

function pathOr(obj, path, otherwise) {
  if (path.length === 0) return true;

  var _path = _toArray(path),
      first = _path[0],
      rest = _path.slice(1);

  return first in obj ? pathOr(obj[first], rest, otherwise) : otherwise;
}

function pipeMw(_x2, _x3) {
  return _pipeMw.apply(this, arguments);
}

function _pipeMw() {
  _pipeMw = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2(init, mws) {
    var fn;
    return _regeneratorRuntime().wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            if (!(mws.length === 0)) {
              _context2.next = 2;
              break;
            }

            return _context2.abrupt("return", init);

          case 2:
            fn = mws.reverse().reduce(function (onion, mw) {
              return /*#__PURE__*/function () {
                var _ref4 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(req) {
                  return _regeneratorRuntime().wrap(function _callee$(_context) {
                    while (1) {
                      switch (_context.prev = _context.next) {
                        case 0:
                          _context.next = 2;
                          return mw(req, onion);

                        case 2:
                          return _context.abrupt("return", _context.sent);

                        case 3:
                        case "end":
                          return _context.stop();
                      }
                    }
                  }, _callee);
                }));

                return function (_x4) {
                  return _ref4.apply(this, arguments);
                };
              }();
            });
            return _context2.abrupt("return", fn(init));

          case 4:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));
  return _pipeMw.apply(this, arguments);
}

function pipeThru(val, fns) {
  return (0, _pipe.pipe)(fns)(val);
}

function pluckKeys(obj, keep) {
  var out = {};

  var _iterator6 = _createForOfIteratorHelper(keep),
      _step6;

  try {
    for (_iterator6.s(); !(_step6 = _iterator6.n()).done;) {
      var key = _step6.value;

      if (key in obj) {
        out[key] = obj[key];
      }
    }
  } catch (err) {
    _iterator6.e(err);
  } finally {
    _iterator6.f();
  }

  return out;
}

function reduceObj(obj, init, reducer) {
  return Object.keys(obj).reduce(function (acc, key) {
    return reducer(acc, obj[key], key);
  }, init);
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

function sortByAll(xs, fns) {
  var fn = function fn(left, right) {
    for (var i = 0; i < fns.length; i += 1) {
      var v = fns[i](left, right);
      if (v !== 0) return v;
    }

    return 0;
  };

  return sortBy(xs, fn);
}

function sortWith(fn, xs) {
  if (xs.length === 0) {
    return [];
  }

  var first = xs[0];
  var fx = fn(first);
  var rest = xs.slice(1);
  var lts = [];
  var gts = [];
  var eqs = [first];

  for (var i = 0; i < rest.length; i += 1) {
    var fy = fn(rest[i]);

    if (fy > fx) {
      gts.push(rest[i]);
    } else if (fy < fx) {
      lts.push(rest[i]);
    } else {
      eqs.push(rest[i]);
    }
  }

  return sortWith(fn, lts).concat(eqs).concat(sortWith(fn, gts));
}

function sortWithAll(xs, fns) {
  if (fns.length === 0 || xs.length <= 1) {
    return xs;
  }

  var fn = fns[0];
  var restFns = fns.slice(1);
  var first = xs[0];
  var fx = fn(first);
  var rest = xs.slice(1);
  var lts = [];
  var gts = [];
  var eqs = [first];

  for (var i = 0; i < rest.length; i += 1) {
    // TODO: reduce this over fns (start with 0, exit on non-zero)
    var fy = fn(rest[i]);

    if (fy > fx) {
      gts.push(rest[i]);
    } else if (fy < fx) {
      lts.push(rest[i]);
    } else {
      eqs.push(rest[i]);
    }
  }

  return [].concat(_toConsumableArray(sortWithAll(fns, lts)), _toConsumableArray(sortWithAll(restFns, eqs)), _toConsumableArray(sortWithAll(fns, gts)));
}

function uniq(xs) {
  return _toConsumableArray(new Set(xs));
}

function uniqBy(xs, fn) {
  var hits = new Set();
  var out = [];

  var _iterator7 = _createForOfIteratorHelper(xs),
      _step7;

  try {
    for (_iterator7.s(); !(_step7 = _iterator7.n()).done;) {
      var x = _step7.value;
      var key = fn(x);

      if (!hits.has(key)) {
        hits.add(key);
        out[out.length] = x;
      }
    }
  } catch (err) {
    _iterator7.e(err);
  } finally {
    _iterator7.f();
  }

  return out;
}

function union(left, right) {
  return new Set([].concat(_toConsumableArray(left), _toConsumableArray(right)));
}

function unnest(xs) {
  return makeFlat(xs, false);
}

function xprod(xs, ys) {
  var xl = xs.length;
  var yl = ys.length;
  var out = [];

  for (var i = 0; i < xl; i += 1) {
    for (var j = 0; j < yl; j += 1) {
      out[out.length] = [xs[i], ys[j]];
    }
  }

  return out;
}

function zipObj(keys, vals) {
  return keys.reduce(function (out, key, idx) {
    var o = _defineProperty({}, key, vals[idx]);

    return _objectSpread(_objectSpread({}, out), o);
  }, {});
}

function makeFlat(list, recursive) {
  var result = [];
  var idx = 0;
  var ilen = list.length;

  while (idx < ilen) {
    if (Array.isArray(list[idx])) {
      var value = recursive ? makeFlat(list[idx], true) : list[idx];
      var j = 0;
      var jlen = value.length;

      while (j < jlen) {
        result[result.length] = value[j];
        j += 1;
      }
    } else {
      result[result.length] = list[idx];
    }

    idx += 1;
  }

  return result;
}