'use strict';

var utils = require('@data-prism/utils');
var core = require('@data-prism/core');
var esToolkit = require('es-toolkit');
var JSON5 = require('json5');
var express = require('express');
var Ajv = require('ajv');
var addFormats = require('ajv-formats');

/**
 * Formats query results into JSON:API response format
 * @param {import("@data-prism/core").Schema} schema - The schema defining resources
 * @param {import("@data-prism/core").RootQuery} query - The query that was executed
 * @param {*} result - The query results to format
 * @returns {Object} JSON:API formatted response object
 */
function formatResponse(schema, query, result) {
	if (result === null) return { data: null };

	const dataIds = new Set();
	const data = utils.applyOrMap(result, (res) => {
		const resSchema = schema.resources[query.type];
		const normalized = core.normalizeResource(schema, query.type, res);
		dataIds.add(res[resSchema.idAttribute ?? "id"]);

		return {
			type: query.type,
			id: res[resSchema.idAttribute ?? "id"],
			attributes: esToolkit.omit(normalized.attributes, [resSchema.idAttribute ?? "id"]),
			relationships: esToolkit.mapValues(normalized.relationships, (rel) => ({
				data: rel,
			})),
		};
	});

	const normalizedQuery = core.normalizeQuery(schema, query);
	const hasIncluded = Object.values(normalizedQuery.select).some(
		(s) => typeof s === "object",
	);

	if (!hasIncluded) {
		return { data };
	}

	const graph = core.createGraphFromResources(
		schema,
		query.type,
		Array.isArray(result) ? result : [result],
	);

	const included = [];
	Object.entries(graph).forEach(([type, ress]) => {
		const relDef = schema.resources[type];

		Object.entries(ress).forEach(([id, res]) => {
			if (type === query.type && dataIds.has(id)) return;

			included.push({
				type,
				id,
				attributes: esToolkit.omit(res.attributes, relDef.idAttribute ?? "id"),
				relationships: esToolkit.mapValues(res.relationships, (rel) => ({ data: rel })),
			});
		});
	});

	return { data, ...(included.length === 0 ? {} : { included }) };
}

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var didYouMean1_2_1 = {exports: {}};

/*

didYouMean.js - A simple JavaScript matching engine
===================================================

[Available on GitHub](https://github.com/dcporter/didyoumean.js).

A super-simple, highly optimized JS library for matching human-quality input to a list of potential
matches. You can use it to suggest a misspelled command-line utility option to a user, or to offer
links to nearby valid URLs on your 404 page. (The examples below are taken from a personal project,
my [HTML5 business card](http://dcporter.aws.af.cm/me), which uses didYouMean.js to suggest correct
URLs from misspelled ones, such as [dcporter.aws.af.cm/me/instagarm](http://dcporter.aws.af.cm/me/instagarm).)
Uses the [Levenshtein distance algorithm](https://en.wikipedia.org/wiki/Levenshtein_distance).

didYouMean.js works in the browser as well as in node.js. To install it for use in node:

```
npm install didyoumean
```


Examples
--------

Matching against a list of strings:
```
var input = 'insargrm'
var list = ['facebook', 'twitter', 'instagram', 'linkedin'];
console.log(didYouMean(input, list));
> 'instagram'
// The method matches 'insargrm' to 'instagram'.

input = 'google plus';
console.log(didYouMean(input, list));
> null
// The method was unable to find 'google plus' in the list of options.
```

Matching against a list of objects:
```
var input = 'insargrm';
var list = [ { id: 'facebook' }, { id: 'twitter' }, { id: 'instagram' }, { id: 'linkedin' } ];
var key = 'id';
console.log(didYouMean(input, list, key));
> 'instagram'
// The method returns the matching value.

didYouMean.returnWinningObject = true;
console.log(didYouMean(input, list, key));
> { id: 'instagram' }
// The method returns the matching object.
```


didYouMean(str, list, [key])
----------------------------

- str: The string input to match.
- list: An array of strings or objects to match against.
- key (OPTIONAL): If your list array contains objects, you must specify the key which contains the string
  to match against.

Returns: the closest matching string, or null if no strings exceed the threshold.


Options
-------

Options are set on the didYouMean function object. You may change them at any time.

### threshold

  By default, the method will only return strings whose edit distance is less than 40% (0.4x) of their length.
  For example, if a ten-letter string is five edits away from its nearest match, the method will return null.

  You can control this by setting the "threshold" value on the didYouMean function. For example, to set the
  edit distance threshold to 50% of the input string's length:

  ```
  didYouMean.threshold = 0.5;
  ```

  To return the nearest match no matter the threshold, set this value to null.

### thresholdAbsolute

  This option behaves the same as threshold, but instead takes an integer number of edit steps. For example,
  if thresholdAbsolute is set to 20 (the default), then the method will only return strings whose edit distance
  is less than 20. Both options apply.

### caseSensitive

  By default, the method will perform case-insensitive comparisons. If you wish to force case sensitivity, set
  the "caseSensitive" value to true:

  ```
  didYouMean.caseSensitive = true;
  ```

### nullResultValue

  By default, the method will return null if there is no sufficiently close match. You can change this value here.

### returnWinningObject

  By default, the method will return the winning string value (if any). If your list contains objects rather
  than strings, you may set returnWinningObject to true.
  
  ```
  didYouMean.returnWinningObject = true;
  ```
  
  This option has no effect on lists of strings.

### returnFirstMatch
  
  By default, the method will search all values and return the closest match. If you're simply looking for a "good-
  enough" match, you can set your thresholds appropriately and set returnFirstMatch to true to substantially speed
  things up.


License
-------

didYouMean copyright (c) 2013-2014 Dave Porter.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License
[here](http://www.apache.org/licenses/LICENSE-2.0).

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/

var hasRequiredDidYouMean1_2_1;

function requireDidYouMean1_2_1 () {
	if (hasRequiredDidYouMean1_2_1) return didYouMean1_2_1.exports;
	hasRequiredDidYouMean1_2_1 = 1;
	(function (module) {
		(function() {

		  // The didYouMean method.
		  function didYouMean(str, list, key) {
		    if (!str) return null;

		    // If we're running a case-insensitive search, smallify str.
		    if (!didYouMean.caseSensitive) { str = str.toLowerCase(); }

		    // Calculate the initial value (the threshold) if present.
		    var thresholdRelative = didYouMean.threshold === null ? null : didYouMean.threshold * str.length,
		        thresholdAbsolute = didYouMean.thresholdAbsolute,
		        winningVal;
		    if (thresholdRelative !== null && thresholdAbsolute !== null) winningVal = Math.min(thresholdRelative, thresholdAbsolute);
		    else if (thresholdRelative !== null) winningVal = thresholdRelative;
		    else if (thresholdAbsolute !== null) winningVal = thresholdAbsolute;
		    else winningVal = null;

		    // Get the edit distance to each option. If the closest one is less than 40% (by default) of str's length,
		    // then return it.
		    var winner, candidate, testCandidate, val,
		        i, len = list.length;
		    for (i = 0; i < len; i++) {
		      // Get item.
		      candidate = list[i];
		      // If there's a key, get the candidate value out of the object.
		      if (key) { candidate = candidate[key]; }
		      // Gatekeep.
		      if (!candidate) { continue; }
		      // If we're running a case-insensitive search, smallify the candidate.
		      if (!didYouMean.caseSensitive) { testCandidate = candidate.toLowerCase(); }
		      else { testCandidate = candidate; }
		      // Get and compare edit distance.
		      val = getEditDistance(str, testCandidate, winningVal);
		      // If this value is smaller than our current winning value, OR if we have no winning val yet (i.e. the
		      // threshold option is set to null, meaning the caller wants a match back no matter how bad it is), then
		      // this is our new winner.
		      if (winningVal === null || val < winningVal) {
		        winningVal = val;
		        // Set the winner to either the value or its object, depending on the returnWinningObject option.
		        if (key && didYouMean.returnWinningObject) winner = list[i];
		        else winner = candidate;
		        // If we're returning the first match, return it now.
		        if (didYouMean.returnFirstMatch) return winner;
		      }
		    }

		    // If we have a winner, return it.
		    return winner || didYouMean.nullResultValue;
		  }

		  // Set default options.
		  didYouMean.threshold = 0.4;
		  didYouMean.thresholdAbsolute = 20;
		  didYouMean.caseSensitive = false;
		  didYouMean.nullResultValue = null;
		  didYouMean.returnWinningObject = null;
		  didYouMean.returnFirstMatch = false;

		  // Expose.
		  // In node...
		  if (module.exports) {
		    module.exports = didYouMean;
		  }
		  // Otherwise...
		  else {
		    window.didYouMean = didYouMean;
		  }

		  var MAX_INT = Math.pow(2,32) - 1; // We could probably go higher than this, but for practical reasons let's not.
		  function getEditDistance(a, b, max) {
		    // Handle null or undefined max.
		    max = max || max === 0 ? max : MAX_INT;

		    var lena = a.length;
		    var lenb = b.length;

		    // Fast path - no A or B.
		    if (lena === 0) return Math.min(max + 1, lenb);
		    if (lenb === 0) return Math.min(max + 1, lena);

		    // Fast path - length diff larger than max.
		    if (Math.abs(lena - lenb) > max) return max + 1;

		    // Slow path.
		    var matrix = [],
		        i, j, colMin, minJ, maxJ;

		    // Set up the first row ([0, 1, 2, 3, etc]).
		    for (i = 0; i <= lenb; i++) { matrix[i] = [i]; }

		    // Set up the first column (same).
		    for (j = 0; j <= lena; j++) { matrix[0][j] = j; }

		    // Loop over the rest of the columns.
		    for (i = 1; i <= lenb; i++) {
		      colMin = MAX_INT;
		      minJ = 1;
		      if (i > max) minJ = i - max;
		      maxJ = lenb + 1;
		      if (maxJ > max + i) maxJ = max + i;
		      // Loop over the rest of the rows.
		      for (j = 1; j <= lena; j++) {
		        // If j is out of bounds, just put a large value in the slot.
		        if (j < minJ || j > maxJ) {
		          matrix[i][j] = max + 1;
		        }

		        // Otherwise do the normal Levenshtein thing.
		        else {
		          // If the characters are the same, there's no change in edit distance.
		          if (b.charAt(i - 1) === a.charAt(j - 1)) {
		            matrix[i][j] = matrix[i - 1][j - 1];
		          }
		          // Otherwise, see if we're substituting, inserting or deleting.
		          else {
		            matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // Substitute
		                                    Math.min(matrix[i][j - 1] + 1, // Insert
		                                    matrix[i - 1][j] + 1)); // Delete
		          }
		        }

		        // Either way, update colMin.
		        if (matrix[i][j] < colMin) colMin = matrix[i][j];
		      }

		      // If this column's minimum is greater than the allowed maximum, there's no point
		      // in going on with life.
		      if (colMin > max) return max + 1;
		    }
		    // If we made it this far without running into the max, then return the final matrix value.
		    return matrix[lenb][lena];
		  }

		})(); 
	} (didYouMean1_2_1));
	return didYouMean1_2_1.exports;
}

var didYouMean1_2_1Exports = requireDidYouMean1_2_1();
var didYouMean = /*@__PURE__*/getDefaultExportFromCjs(didYouMean1_2_1Exports);

function isUnsafeProperty(key) {
    return key === '__proto__';
}

function isDeepKey(key) {
    switch (typeof key) {
        case 'number':
        case 'symbol': {
            return false;
        }
        case 'string': {
            return key.includes('.') || key.includes('[') || key.includes(']');
        }
    }
}

function toKey(value) {
    if (typeof value === 'string' || typeof value === 'symbol') {
        return value;
    }
    if (Object.is(value?.valueOf?.(), -0)) {
        return '-0';
    }
    return String(value);
}

function toPath(deepKey) {
    const result = [];
    const length = deepKey.length;
    if (length === 0) {
        return result;
    }
    let index = 0;
    let key = '';
    let quoteChar = '';
    let bracket = false;
    if (deepKey.charCodeAt(0) === 46) {
        result.push('');
        index++;
    }
    while (index < length) {
        const char = deepKey[index];
        if (quoteChar) {
            if (char === '\\' && index + 1 < length) {
                index++;
                key += deepKey[index];
            }
            else if (char === quoteChar) {
                quoteChar = '';
            }
            else {
                key += char;
            }
        }
        else if (bracket) {
            if (char === '"' || char === "'") {
                quoteChar = char;
            }
            else if (char === ']') {
                bracket = false;
                result.push(key);
                key = '';
            }
            else {
                key += char;
            }
        }
        else {
            if (char === '[') {
                bracket = true;
                if (key) {
                    result.push(key);
                    key = '';
                }
            }
            else if (char === '.') {
                if (key) {
                    result.push(key);
                    key = '';
                }
            }
            else {
                key += char;
            }
        }
        index++;
    }
    if (key) {
        result.push(key);
    }
    return result;
}

function get$1(object, path, defaultValue) {
    if (object == null) {
        return defaultValue;
    }
    switch (typeof path) {
        case 'string': {
            if (isUnsafeProperty(path)) {
                return defaultValue;
            }
            const result = object[path];
            if (result === undefined) {
                if (isDeepKey(path)) {
                    return get$1(object, toPath(path), defaultValue);
                }
                else {
                    return defaultValue;
                }
            }
            return result;
        }
        case 'number':
        case 'symbol': {
            if (typeof path === 'number') {
                path = toKey(path);
            }
            const result = object[path];
            if (result === undefined) {
                return defaultValue;
            }
            return result;
        }
        default: {
            if (Array.isArray(path)) {
                return getWithPath(object, path, defaultValue);
            }
            if (Object.is(path?.valueOf(), -0)) {
                path = '-0';
            }
            else {
                path = String(path);
            }
            if (isUnsafeProperty(path)) {
                return defaultValue;
            }
            const result = object[path];
            if (result === undefined) {
                return defaultValue;
            }
            return result;
        }
    }
}
function getWithPath(object, path, defaultValue) {
    if (path.length === 0) {
        return defaultValue;
    }
    let current = object;
    for (let index = 0; index < path.length; index++) {
        if (current == null) {
            return defaultValue;
        }
        if (isUnsafeProperty(path[index])) {
            return defaultValue;
        }
        current = current[path[index]];
    }
    if (current === undefined) {
        return defaultValue;
    }
    return current;
}

/**
 * Creates a simple transformation expression that applies a function to the resolved operand.
 * @param {function(any): any} transformFn - Function that transforms the resolved operand
 * @param {string} evaluateErrorMessage - Error message for non-array operands in evaluate form
 * @returns {object} Expression object with apply and evaluate methods
 */
const createSimpleExpression = (transformFn, evaluateErrorMessage) => ({
  apply: (operand, inputData, { apply }) =>
    transformFn(apply(operand, inputData)),
  evaluate: (operand, { evaluate }) => {
    if (!Array.isArray(operand)) {
      throw new Error(evaluateErrorMessage);
    }
    const [value] = operand;
    return transformFn(evaluate(value));
  },
});

const $isDefined = createSimpleExpression(
  (value) => value !== undefined,
  "$isDefined evaluate form requires array operand: [value]",
);

const $ensurePath = {
  apply: (operand, inputData, { apply }) => {
    const path = apply(operand, inputData);
    const go = (curValue, paths, used = []) => {
      if (paths.length === 0) return;

      const [head, ...tail] = paths;
      if (!(head in curValue)) {
        throw new Error(
          `"${head}" was not found along the path ${used.join(".")}`,
        );
      }

      go(curValue[head], tail, [...used, head]);
    };

    go(inputData, path.split("."));
    return inputData;
  },
  evaluate: (operand, { evaluate }) => {
    if (!Array.isArray(operand)) {
      throw new Error(
        "$ensurePath evaluate form requires array operand: [object, path]",
      );
    }
    const [object, path] = operand;
    const evaluatedObject = evaluate(object);
    const evaluatedPath = evaluate(path);
    const go = (curValue, paths, used = []) => {
      if (paths.length === 0) return;

      const [head, ...tail] = paths;
      if (!(head in curValue)) {
        throw new Error(
          `"${head}" was not found along the path ${used.join(".")}`,
        );
      }

      go(curValue[head], tail, [...used, head]);
    };

    go(evaluatedObject, evaluatedPath.split("."));
    return evaluatedObject;
  },
};

const $get = {
  apply: (operand, inputData, { apply }) => {
    if (typeof operand === "string") {
      return get$1(inputData, operand);
    }
    if (Array.isArray(operand)) {
      const [path, defaultValue] = operand;
      const evaluatedPath = apply(path, inputData);
      const result = get$1(inputData, evaluatedPath);
      return result !== undefined ? result : apply(defaultValue, inputData);
    }
    throw new Error("$get operand must be string or array");
  },
  evaluate: (operand, { evaluate }) => {
    if (!Array.isArray(operand)) {
      throw new Error(
        "$get evaluate form requires array operand: [object, path] or [object, path, default]",
      );
    }

    if (operand.length === 2) {
      const [object, path] = operand;
      return get$1(evaluate(object), evaluate(path));
    }

    if (operand.length === 3) {
      const [object, path, defaultValue] = operand;
      const result = get$1(evaluate(object), evaluate(path));
      return result !== undefined ? result : evaluate(defaultValue);
    }

    throw new Error(
      "$get evaluate form requires array operand: [object, path] or [object, path, default]",
    );
  },
};

const $prop = {
  apply: (operand, inputData, { apply }) => {
    const property = apply(operand, inputData);
    return inputData[property];
  },
  evaluate: (operand, { evaluate }) => {
    if (!Array.isArray(operand)) {
      throw new Error(
        "$prop evaluate form requires array operand: [object, property]",
      );
    }
    const [object, property] = operand;
    const evaluatedObject = evaluate(object);
    const evaluatedProperty = evaluate(property);
    return evaluatedObject[evaluatedProperty];
  },
};

const $literal = {
  apply: (operand) => operand,
  evaluate: (operand) => operand,
};

const $debug = {
  apply: (operand, inputData, { apply }) => {
    const value = apply(operand, inputData);
    console.log(value);
    return value;
  },
  evaluate: (operand, { evaluate }) => {
    const value = evaluate(operand);
    console.log(value);
    return value;
  },
};

/**
 * Creates a composition expression that chains expressions together.
 * @param {function(Array, function): any} composeFn - Function that takes (expressions, reduceFn) and returns result
 * @returns {object} Expression object with apply and evaluate methods
 */
const createCompositionExpression = (composeFn) => ({
  apply: (operand, inputData, { apply, isExpression }) => {
    // Validate that all elements are expressions
    operand.forEach((expr) => {
      if (!isExpression(expr)) {
        throw new Error(`${JSON.stringify(expr)} is not a valid expression`);
      }
    });
    return composeFn(operand, (acc, expr) => apply(expr, acc), inputData);
  },
  evaluate: (operand, { apply, isExpression }) => {
    const [expressions, initialValue] = operand;
    // Validate that all elements are expressions
    expressions.forEach((expr) => {
      if (!isExpression(expr)) {
        throw new Error(`${JSON.stringify(expr)} is not a valid expression`);
      }
    });
    return composeFn(
      expressions,
      (acc, expr) => apply(expr, acc),
      initialValue,
    );
  },
});

const $compose = createCompositionExpression(
  (expressions, reduceFn, initialValue) =>
    expressions.reduceRight(reduceFn, initialValue),
);

const $pipe = createCompositionExpression(
  (expressions, reduceFn, initialValue) =>
    expressions.reduce(reduceFn, initialValue),
);

const coreDefinitions = {
  $compose,
  $debug,
  $get,
  $isDefined,
  $literal,
  $pipe,
  $prop,
  $ensurePath,
};

/**
 * Creates an aggregative expression that applies a calculation function to resolved values.
 *
 * @param {function(Array): any} calculateFn - Function that takes an array of values and returns a calculated result
 * @returns {object} Expression object with apply and evaluate methods
 */
const createAggregativeExpression = (calculateFn) => ({
  apply(operand, inputData, { apply }) {
    const values = apply(operand, inputData);
    return calculateFn(values);
  },
  evaluate: (operand, { evaluate }) => {
    const values = evaluate(operand);
    return calculateFn(values);
  },
});

const $count = createAggregativeExpression((values) => values.length);

const $max = createAggregativeExpression((values) => {
  return values.length === 0
    ? undefined
    : values.reduce((max, v) => Math.max(max, v));
});

const $min = createAggregativeExpression((values) => {
  return values.length === 0
    ? undefined
    : values.reduce((min, v) => Math.min(min, v));
});

const $sum = createAggregativeExpression((values) => {
  return values.reduce((sum, v) => sum + v, 0);
});

const $mean = createAggregativeExpression((values) => {
  return values.length === 0
    ? undefined
    : values.reduce((sum, v) => sum + v, 0) / values.length;
});

const $median = createAggregativeExpression((values) => {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
});

const $mode = createAggregativeExpression((values) => {
  if (values.length === 0) return undefined;
  const frequency = {};
  let maxCount = 0;
  let modes = [];

  // Count frequencies
  for (const value of values) {
    frequency[value] = (frequency[value] ?? 0) + 1;
    if (frequency[value] > maxCount) {
      maxCount = frequency[value];
      modes = [value];
    } else if (frequency[value] === maxCount && !modes.includes(value)) {
      modes.push(value);
    }
  }

  // Return single mode if only one, array if multiple, or undefined if all values appear once
  return maxCount === 1
    ? undefined
    : modes.length === 1
      ? modes[0]
      : modes.sort((a, b) => a - b);
});

const aggregativeDefinitions = {
  $count,
  $max,
  $mean,
  $median,
  $min,
  $mode,
  $sum,
};

/**
 * Creates a comparative expression that applies a comparison function to resolved operands.
 *
 * @param {function(any, any): boolean} compareFn - Function that takes two values and returns a boolean comparison result
 * @returns {object} Expression object with apply and evaluate methods
 */
const createComparativeExpression = (compareFn) => ({
  apply(operand, inputData, { apply }) {
    const resolvedOperand = apply(operand, inputData);
    return compareFn(inputData, resolvedOperand);
  },
  evaluate: (operand, { evaluate }) => {
    const [left, right] = operand;
    return compareFn(evaluate(left), evaluate(right));
  },
});

/**
 * Creates an inclusion expression that checks if a value is in/not in an array.
 *
 * @param {function(any, Array): boolean} inclusionFn - Function that takes a value and array and returns boolean
 * @param {string} expressionName - Name of the expression for error messages
 * @returns {object} Expression object with apply and evaluate methods
 */
const createInclusionExpression = (expressionName, inclusionFn) => ({
  apply(operand, inputData, { apply }) {
    const resolvedOperand = apply(operand, inputData);
    if (!Array.isArray(resolvedOperand)) {
      throw new Error(`${expressionName} parameter must be an array`);
    }
    return inclusionFn(inputData, resolvedOperand);
  },
  evaluate: (operand, { evaluate }) => {
    const [array, value] = evaluate(operand);
    if (!Array.isArray(array)) {
      throw new Error(`${expressionName} parameter must be an array`);
    }
    return inclusionFn(value, array);
  },
});

const $eq = createComparativeExpression((a, b) => esToolkit.isEqual(a, b));
const $ne = createComparativeExpression((a, b) => !esToolkit.isEqual(a, b));
const $gt = createComparativeExpression((a, b) => a > b);
const $gte = createComparativeExpression((a, b) => a >= b);
const $lt = createComparativeExpression((a, b) => a < b);
const $lte = createComparativeExpression((a, b) => a <= b);

const $in = createInclusionExpression("$in", (value, array) =>
  array.includes(value),
);
const $nin = createInclusionExpression(
  "$nin",
  (value, array) => !array.includes(value),
);

/**
 * Tests if a string matches a regular expression pattern.
 *
 * **Uses PCRE (Perl Compatible Regular Expression) semantics** as the canonical standard
 *
 * Supports inline flags using the syntax (?flags)pattern where flags can be:
 * - i: case insensitive matching
 * - m: multiline mode (^ and $ match line boundaries)
 * - s: dotall mode (. matches newlines)
 *
 * PCRE defaults (when no flags specified):
 * - Case-sensitive matching
 * - ^ and $ match string boundaries (not line boundaries)
 * - . does not match newlines
 *
 * @example
 * // Basic pattern matching
 * apply("hello", "hello world") // true
 * apply("\\d+", "abc123") // true
 *
 * @example
 * // With inline flags
 * apply("(?i)hello", "HELLO WORLD") // true (case insensitive)
 * apply("(?m)^line2", "line1\nline2") // true (multiline)
 * apply("(?s)hello.world", "hello\nworld") // true (dotall)
 * apply("(?ims)^hello.world$", "HELLO\nWORLD") // true (combined flags)
 *
 * @example
 * // In WHERE clauses
 * { name: { $matchesRegex: "^[A-Z].*" } } // Names starting with capital letter
 * { email: { $matchesRegex: "(?i).*@example\\.com$" } } // Case-insensitive email domain check
 */
const $matchesRegex = {
  apply(operand, inputData, { apply }) {
    const resolvedOperand = apply(operand, inputData);
    const pattern = resolvedOperand;
    if (typeof inputData !== "string") {
      throw new Error("$matchesRegex requires string input");
    }

    // Extract inline flags and clean pattern
    const flagMatch = pattern.match(/^\(\?([ims]*)\)(.*)/);
    if (flagMatch) {
      const [, flags, patternPart] = flagMatch;
      let jsFlags = "";

      if (flags.includes("i")) jsFlags += "i";
      if (flags.includes("m")) jsFlags += "m";
      if (flags.includes("s")) jsFlags += "s";

      const regex = new RegExp(patternPart, jsFlags);
      return regex.test(inputData);
    }

    // Check for unsupported inline flags and strip them
    const unsupportedFlagMatch = pattern.match(/^\(\?[^)]*\)(.*)/);
    if (unsupportedFlagMatch) {
      const [, patternPart] = unsupportedFlagMatch;
      const regex = new RegExp(patternPart);
      return regex.test(inputData);
    }

    // No inline flags - use PCRE defaults
    const regex = new RegExp(pattern);
    return regex.test(inputData);
  },
  evaluate: (operand, { evaluate }) => {
    const [pattern, inputData] = operand;
    const resolvedPattern = evaluate(pattern);
    const resolvedInputData = evaluate(inputData);
    if (typeof resolvedInputData !== "string") {
      throw new Error("$matchesRegex requires string input");
    }

    // Extract inline flags and clean pattern
    const flagMatch = resolvedPattern.match(/^\(\?([ims]*)\)(.*)/);
    if (flagMatch) {
      const [, flags, patternPart] = flagMatch;
      let jsFlags = "";

      if (flags.includes("i")) jsFlags += "i";
      if (flags.includes("m")) jsFlags += "m";
      if (flags.includes("s")) jsFlags += "s";

      const regex = new RegExp(patternPart, jsFlags);
      return regex.test(resolvedInputData);
    }

    // Check for unsupported inline flags and strip them
    const unsupportedFlagMatch = resolvedPattern.match(/^\(\?[^)]*\)(.*)/);
    if (unsupportedFlagMatch) {
      const [, patternPart] = unsupportedFlagMatch;
      const regex = new RegExp(patternPart);
      return regex.test(resolvedInputData);
    }

    // No inline flags - use PCRE defaults
    const regex = new RegExp(resolvedPattern);
    return regex.test(resolvedInputData);
  },
};

/**
 * Tests if a string matches a SQL LIKE pattern.
 *
 * Provides database-agnostic LIKE pattern matching with SQL standard semantics:
 * - % matches any sequence of characters (including none)
 * - _ matches exactly one character
 * - Case-sensitive matching (consistent across databases)
 *
 * @example
 * // Basic LIKE patterns
 * apply("hello%", "hello world") // true
 * apply("%world", "hello world") // true
 * apply("h_llo", "hello") // true
 * apply("h_llo", "hallo") // true
 *
 * @example
 * // In WHERE clauses
 * { name: { $matchesLike: "John%" } } // Names starting with "John"
 * { email: { $matchesLike: "%@gmail.com" } } // Gmail addresses
 * { code: { $matchesLike: "A_B_" } } // Codes like "A1B2", "AXBY"
 */
const $matchesLike = createComparativeExpression((inputData, pattern) => {
  if (typeof inputData !== "string") {
    throw new Error("$matchesLike requires string input");
  }

  // Convert SQL LIKE pattern to JavaScript regex
  let regexPattern = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&") // Escape regex special chars
    .replace(/%/g, ".*") // % becomes .*
    .replace(/_/g, "."); // _ becomes .

  // Anchor the pattern to match the entire string
  regexPattern = "^" + regexPattern + "$";

  const regex = new RegExp(regexPattern);
  return regex.test(inputData);
});

/**
 * Tests if a string matches a Unix shell GLOB pattern.
 *
 * Provides database-agnostic GLOB pattern matching with Unix shell semantics:
 * - * matches any sequence of characters (including none)
 * - ? matches exactly one character
 * - [chars] matches any single character in the set
 * - [!chars] or [^chars] matches any character not in the set
 * - Case-sensitive matching
 *
 * @example
 * // Basic GLOB patterns
 * apply("hello*", "hello world") // true
 * apply("*world", "hello world") // true
 * apply("h?llo", "hello") // true
 * apply("h?llo", "hallo") // true
 * apply("[hw]ello", "hello") // true
 * apply("[hw]ello", "wello") // true
 * apply("[!hw]ello", "bello") // true
 *
 * @example
 * // In WHERE clauses
 * { filename: { $matchesGlob: "*.txt" } } // Text files
 * { name: { $matchesGlob: "[A-Z]*" } } // Names starting with capital
 * { code: { $matchesGlob: "IMG_[0-9][0-9][0-9][0-9]" } } // Image codes
 */
const $matchesGlob = createComparativeExpression((inputData, pattern) => {
  if (typeof inputData !== "string") {
    throw new Error("$matchesGlob requires string input");
  }

  // Convert GLOB pattern to JavaScript regex
  let regexPattern = "";
  let i = 0;

  while (i < pattern.length) {
    const char = pattern[i];

    if (char === "*") {
      regexPattern += ".*";
    } else if (char === "?") {
      regexPattern += ".";
    } else if (char === "[") {
      // Handle character classes
      let j = i + 1;
      let isNegated = false;

      // Check for negation
      if (j < pattern.length && (pattern[j] === "!" || pattern[j] === "^")) {
        isNegated = true;
        j++;
      }

      // Find the closing bracket
      let classContent = "";
      while (j < pattern.length && pattern[j] !== "]") {
        classContent += pattern[j];
        j++;
      }

      if (j < pattern.length) {
        // Valid character class
        regexPattern +=
          "[" +
          (isNegated ? "^" : "") +
          classContent.replace(/\\/g, "\\\\") +
          "]";
        i = j;
      } else {
        // No closing bracket, treat as literal
        regexPattern += "\\[";
      }
    } else {
      // Escape regex special characters
      regexPattern += char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    i++;
  }

  // Anchor the pattern to match the entire string
  regexPattern = "^" + regexPattern + "$";

  const regex = new RegExp(regexPattern);
  return regex.test(inputData);
});

const comparativeDefinitions = {
  $eq,
  $gt,
  $gte,
  $lt,
  $lte,
  $ne,
  $in,
  $nin,
  $matchesRegex,
  $matchesLike,
  $matchesGlob,
};

const $if = {
  apply(operand, inputData, { apply }) {
    const condition = apply(operand.if, inputData);
    if (typeof condition !== "boolean") {
      throw new Error(
        `$if.if must be a boolean or an expression that resolves to one, got ${JSON.stringify(condition)}`,
      );
    }

    return condition
      ? apply(operand.then, inputData)
      : apply(operand.else, inputData);
  },
  evaluate: (operand, { evaluate }) => {
    const condition = evaluate(operand.if);
    if (typeof condition !== "boolean") {
      throw new Error(
        `$if.if must be a boolean or an expression that resolves to one, got ${JSON.stringify(condition)}`,
      );
    }

    return condition ? evaluate(operand.then) : evaluate(operand.else);
  },
};

const $switch = {
  apply(operand, inputData, { apply }) {
    // Evaluate the value once
    const value = apply(operand.value, inputData);
    const found = operand.cases.find((caseItem) => {
      if (caseItem.when === undefined) {
        throw new Error("Switch case must have 'when' property");
      }

      return esToolkit.isEqual(apply(caseItem.when, inputData), value);
    });

    // Return default if no case matches
    return found
      ? apply(found.then, inputData)
      : apply(operand.default, inputData);
  },
  evaluate(operand, { evaluate }) {
    const [switchOperand] = operand;
    // Evaluate the value once
    const value = evaluate(switchOperand.value);
    const found = switchOperand.cases.find((caseItem) => {
      if (caseItem.when === undefined) {
        throw new Error("Switch case must have 'when' property");
      }

      return esToolkit.isEqual(evaluate(caseItem.when), value);
    });

    // Return default if no case matches
    return found ? evaluate(found.then) : evaluate(switchOperand.default);
  },
};

const $case = {
  apply(operand, inputData, { apply }) {
    // Evaluate the value once
    const value = apply(operand.value, inputData);
    const found = operand.cases.find((caseItem) => {
      if (caseItem.when === undefined) {
        throw new Error("Case item must have 'when' property");
      }

      const condition = apply(caseItem.when, value);
      if (typeof condition !== "boolean") {
        throw new Error(
          `$case.when must resolve to a boolean, got ${JSON.stringify(condition)}`,
        );
      }
      return condition;
    });

    // Return default if no case matches
    return found
      ? apply(found.then, inputData)
      : apply(operand.default, inputData);
  },
  evaluate(operand, { evaluate }) {
    const [caseOperand] = operand;
    const found = caseOperand.cases.find((caseItem) => {
      if (caseItem.when === undefined) {
        throw new Error("Case item must have 'when' property");
      }

      const condition = evaluate(caseItem.when);
      if (typeof condition !== "boolean") {
        throw new Error(
          `$case.when must resolve to a boolean, got ${JSON.stringify(condition)}`,
        );
      }
      return condition;
    });

    // Return default if no case matches
    return found ? evaluate(found.then) : evaluate(caseOperand.default);
  },
};

const conditionalDefinitions = { $if, $switch, $case };

/**
 * Creates a generative expression that produces values without needing input data or nested expressions.
 * @param {function(any): any} generateFn - Function that takes operand and generates a value
 * @returns {object} Expression object with apply and evaluate methods
 */
const createGenerativeExpression = (generateFn) => ({
  apply: (operand) => generateFn(operand),
  evaluate: (operand) => generateFn(operand),
});

const $random = createGenerativeExpression((operand = {}) => {
  const { min = 0, max = 1, precision = null } = operand ?? {};
  const value = Math.random() * (max - min) + min;

  if (precision == null) {
    return value;
  }

  if (precision >= 0) {
    // Positive precision: decimal places
    return Number(value.toFixed(precision));
  } else {
    // Negative precision: round to 10^(-precision)
    const factor = Math.pow(10, -precision);
    return Math.round(value / factor) * factor;
  }
});

const $uuid = createGenerativeExpression(() => crypto.randomUUID());

const generativeDefinitions = {
  $random,
  $uuid,
};

/**
 * Creates an array iteration expression that applies a function to array elements.
 * @param {function(Array, function): any} arrayMethodFn - Function that takes (array, itemFn) and returns result
 * @param {string} expressionName - Name of the expression for evaluate form
 * @returns {object} Expression object with apply and evaluate methods
 */
const createArrayIterationExpression = (arrayMethodFn, expressionName) => ({
  apply: (operand, inputData, { apply }) =>
    arrayMethodFn(inputData, (item) => apply(operand, item)),
  evaluate: (operand, { apply }) => {
    const [fn, items] = operand;
    return apply({ [expressionName]: fn }, items);
  },
});

/**
 * Creates a simple array operation expression.
 * @param {function(any, Array): any} operationFn - Function that takes (operand, inputData) and returns result
 * @returns {object} Expression object with apply and evaluate methods
 */
const createArrayOperationExpression = (operationFn) => ({
  apply: (operand, inputData) => operationFn(operand, inputData),
  evaluate: (operand, { evaluate }) => {
    const [arg1, arg2] = operand;
    return operationFn(evaluate(arg1), evaluate(arg2));
  },
});

const $filter = createArrayIterationExpression(
  (array, itemFn) => array.filter(itemFn),
  "$filter",
);

const $flatMap = createArrayIterationExpression(
  (array, itemFn) => array.flatMap(itemFn),
  "$flatMap",
);

const $map = createArrayIterationExpression(
  (array, itemFn) => array.map(itemFn),
  "$map",
);

const $any = createArrayIterationExpression(
  (array, itemFn) => array.some(itemFn),
  "$any",
);

const $all = createArrayIterationExpression(
  (array, itemFn) => array.every(itemFn),
  "$all",
);

const $find = createArrayIterationExpression(
  (array, itemFn) => array.find(itemFn),
  "$find",
);

const $append = createArrayOperationExpression((arrayToConcat, baseArray) =>
  baseArray.concat(arrayToConcat),
);

const $prepend = createArrayOperationExpression((arrayToPrepend, baseArray) =>
  arrayToPrepend.concat(baseArray),
);

const $join = createArrayOperationExpression((separator, array) =>
  array.join(separator),
);

const $reverse = {
  apply: (_, inputData) => inputData.slice().reverse(),
  evaluate: (operand, { evaluate }) => {
    const array = evaluate(operand);
    return array.slice().reverse();
  },
};

const iterativeDefinitions = {
  $all,
  $any,
  $append,
  $filter,
  $find,
  $flatMap,
  $join,
  $map,
  $prepend,
  $reverse,
};

/**
 * Creates an array logical expression that applies a logical operation to an array of conditions.
 * @param {function(Array, function): boolean} arrayMethodFn - Function that takes (array, predicate) and returns boolean
 * @returns {object} Expression object with apply and evaluate methods
 */
const createArrayLogicalExpression = (arrayMethodFn) => ({
  apply: (operand, inputData, { apply }) =>
    arrayMethodFn(operand, (subexpr) => apply(subexpr, inputData)),
  evaluate: (operand, { evaluate }) =>
    arrayMethodFn(operand, (value) => {
      return typeof value === "boolean" ? value : Boolean(evaluate(value));
    }),
});

const $and = createArrayLogicalExpression((array, predicate) =>
  array.every(predicate),
);

const $or = createArrayLogicalExpression((array, predicate) =>
  array.some(predicate),
);

const $not = {
  apply: (operand, inputData, { apply }) => !apply(operand, inputData),
  evaluate: (operand, { evaluate }) => {
    const value = typeof operand === "boolean" ? operand : evaluate(operand);
    return !value;
  },
};

const logicalDefinitions = {
  $and,
  $not,
  $or,
};

/**
 * Creates a temporal expression that generates time-based values without needing operands or input data.
 * @param {function(): any} generateFn - Function that generates a time-based value
 * @returns {object} Expression object with apply and evaluate methods
 */
const createTemporalExpression = (generateFn) => ({
  apply: generateFn,
  evaluate: generateFn,
});

const $nowLocal = createTemporalExpression(() => {
  const now = new Date();
  const offset = -now.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const hours = Math.floor(Math.abs(offset) / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (Math.abs(offset) % 60).toString().padStart(2, "0");
  return now.toISOString().slice(0, -1) + sign + hours + ":" + minutes;
});

const $nowUTC = createTemporalExpression(() => new Date().toISOString());

const $timestamp = createTemporalExpression(() => Date.now());

const temporalDefinitions = {
  $nowLocal,
  $nowUTC,
  $timestamp,
};

/**
 * Creates a math expression that performs binary operations.
 * @param {function(number, number): number} operationFn - Function that takes (left, right) and returns result
 * @param {function(number, number): void} [validateFn] - Optional validation function for divide by zero checks
 * @returns {object} Expression object with apply and evaluate methods
 */
const createMathExpression = (operationFn, validateFn) => ({
  apply: (operand, inputData) => {
    if (validateFn) validateFn(inputData, operand);
    return operationFn(inputData, operand);
  },
  evaluate: (operand, { evaluate }) => {
    if (!Array.isArray(operand) || operand.length !== 2) {
      throw new Error(
        "Math expressions require array of exactly 2 elements in evaluate form",
      );
    }
    const [left, right] = operand;
    const leftValue = evaluate(left);
    const rightValue = evaluate(right);
    if (validateFn) validateFn(leftValue, rightValue);
    return operationFn(leftValue, rightValue);
  },
});

const $add = createMathExpression((left, right) => left + right);

const $subtract = createMathExpression((left, right) => left - right);

const $multiply = createMathExpression((left, right) => left * right);

const $divide = createMathExpression(
  (left, right) => left / right,
  (left, right) => {
    if (right === 0) {
      throw new Error("Division by zero");
    }
  },
);

const $modulo = createMathExpression(
  (left, right) => left % right,
  (left, right) => {
    if (right === 0) {
      throw new Error("Modulo by zero");
    }
  },
);

const mathDefinitions = {
  $add,
  $subtract,
  $multiply,
  $divide,
  $modulo,
};

/**
 * @typedef {object} ApplicativeExpression
 */

/**
 * @typedef {object} Expression
 */

/**
 * @template Args, Input, Output
 * @typedef {object} Expression
 * @property {function(any, Input): Output} apply
 * @property {function(Args, Input, any): Output} [applyImplicit]
 * @property {function(Input): Output} evaluate
 * @property {string} [name]
 * @property {object} schema
 */

/**
 * @typedef {object} ExpressionEngine
 * @property {function(Expression, any): any} apply
 * @property {function(Expression): any} evaluate
 * @property {string[]} expressionNames
 * @property {function(Expression): boolean} isExpression
 */

/**
 * @template Args, Input, Output
 * @typedef {function(...any): Expression} FunctionExpression
 */

function looksLikeExpression(val) {
  return (
    val !== null &&
    typeof val === "object" &&
    !Array.isArray(val) &&
    Object.keys(val).length === 1 &&
    Object.keys(val)[0].startsWith("$")
  );
}

/**
 * @param {object} definitions
 * @param {boolean} [mergeDefaults=true] whether or not to include the core definitions in the engine
 *
 * @returns {ExpressionEngine}
 */
function createExpressionEngine(definitions, mergeDefaults = true) {
  const expressions = mergeDefaults
    ? { ...coreDefinitions, ...definitions }
    : definitions;

  const isExpression = (val) =>
    looksLikeExpression(val) && Object.keys(val)[0] in expressions;

  const checkLooksLikeExpression = (val) => {
    if (looksLikeExpression(val)) {
      const [invalidOp] = Object.keys(val);
      const availableOps = Object.keys(expressions);

      const suggestion = didYouMean(invalidOp, availableOps);
      const helpText = suggestion
        ? `Did you mean "${suggestion}"?`
        : `Available operators: ${availableOps
            .slice(0, 8)
            .join(", ")}${availableOps.length > 8 ? ", ..." : ""}.`;

      const message = `Unknown expression operator: "${invalidOp}". ${helpText} Use { $literal: ${JSON.stringify(val)} } if you meant this as a literal value.`;

      throw new Error(message);
    }
  };

  const apply = (val, inputData) => {
    if (isExpression(val)) {
      const [expressionName, operand] = Object.entries(val)[0];
      const expressionDef = expressions[expressionName];

      return expressionDef.apply(operand, inputData, { isExpression, apply });
    }

    checkLooksLikeExpression(val);

    return Array.isArray(val)
      ? val.map((v) => apply(v, inputData))
      : val !== null && typeof val === "object"
        ? esToolkit.mapValues(val, (v) => apply(v, inputData))
        : val;
  };

  const evaluate = (val) => {
    if (isExpression(val)) {
      const [expressionName, operand] = Object.entries(val)[0];
      const expressionDef = expressions[expressionName];

      return expressionDef.evaluate(operand, { isExpression, evaluate, apply });
    }

    checkLooksLikeExpression(val);

    return Array.isArray(val)
      ? val.map(evaluate)
      : val !== null && typeof val === "object"
        ? esToolkit.mapValues(val, evaluate)
        : val;
  };

  return {
    apply,
    evaluate,
    expressionNames: Object.keys(expressions),
    isExpression,
  };
}

const defaultExpressions = {
  ...coreDefinitions,
  ...aggregativeDefinitions,
  ...comparativeDefinitions,
  ...conditionalDefinitions,
  ...generativeDefinitions,
  ...iterativeDefinitions,
  ...logicalDefinitions,
  ...mathDefinitions,
  ...temporalDefinitions,
};

const defaultExpressionEngine =
  createExpressionEngine(defaultExpressions);

const casters = {
	boolean: (x) => x === "true",
	number: (x) => Number(x),
	integer: (x) => Number(x),
};

const castFilterValue = (type, val) => {
	if (!casters[type]) return val;

	const parsed =
		typeof val === "string" && val.match(/^\[.*\]$/)
			? val.slice(1, -1).split(",")
			: val;

	return Array.isArray(parsed)
		? parsed.map(casters[type])
		: typeof val === "object"
			? esToolkit.mapValues(val, (v) => castFilterValue(type, v))
			: casters[type](val);
};

/**
 * Parses JSON:API request parameters into a Data Prism query
 * @param {import("@data-prism/core").Schema} schema - The schema defining resources
 * @param {*} params - Request parameters from Express
 * @returns {import("@data-prism/core").RootQuery} Parsed query object
 */
function parseRequest(schema, params) {
	const parsedInclude = params.include?.split(",") ?? [];

	const go = (type, path = []) => {
		const { id, fields, filter, sort, page } = params;
		const resDef = schema.resources[type];

		const relevantFilters = esToolkit.pickBy(
			filter ?? {},
			(f, k) =>
				(path.length === 0 && !k.includes(".")) ||
				(k.startsWith(`${path.join(".")}.`) &&
					!k.split(`${path.join(".")}.`)[1].includes(".")),
		);

		const parsedFilters = {};
		Object.entries(relevantFilters).forEach(([key, val]) => {
			parsedFilters[
				path.length === 0 ? key : key.split(`${path.join(".")}.`)[1]
			] = val;
		});

		const castFilters = esToolkit.mapValues(parsedFilters, (param, key) => {
			const attrType = resDef.attributes[key].type;

			if (defaultExpressionEngine.isExpression(param)) {
				return castFilterValue(attrType, param);
			}

			try {
				const parsed = JSON5.parse(param);
				if (defaultExpressionEngine.isExpression(parsed)) {
					return castFilterValue(attrType, parsed);
				}
			} catch {
				// noop
			}

			return castFilterValue(attrType, param);
		});

		const included = parsedInclude
			.filter(
				(i) =>
					(path.length === 0 && !i.includes(".")) ||
					(i.startsWith(`${path.join(".")}.`) &&
						!i.split(`${path.join(".")}.`)[1].includes(".")),
			)
			.map((i) => (path.length === 0 ? i : i.split(`${path.join(".")}.`)[1]));

		const select = [
			...(fields?.[type]
				? esToolkit.uniq([
						...fields[type].split(","),
						resDef.idAttribute ?? "id",
						...Object.keys(parsedFilters ?? {}),
					])
				: Object.keys(resDef.attributes)),
			...included.map((related) => ({
				[related]: go(resDef.relationships[related].type, [...path, related]),
			})),
		];

		const order =
			sort && path.length === 0
				? sort.split(",").map((field) => {
						const parsedField = field[0] === "-" ? field.slice(1) : field;
						if (!Object.keys(resDef.attributes).includes(parsedField)) {
							throw new Error(
								`${parsedField} is not a valid attribute of ${type}`,
							);
						}

						return { [parsedField]: field[0] === "-" ? "desc" : "asc" };
					})
				: null;

		const limit = page?.size ? Number(page.size) : null;
		const offset = page?.number
			? (Number(page.number) - 1) * Number(page?.size ?? 1)
			: null;

		return {
			...(path.length === 0 ? { type } : {}),
			...(path.length === 0 && id ? { id } : {}),
			select,
			...(Object.keys(relevantFilters).length > 0
				? { where: castFilters }
				: {}),
			...(order ? { order } : {}),
			...(limit ? { limit } : {}),
			...(offset ? { offset } : {}),
		};
	};

	return go(params.type);
}

var $schema = "http://json-schema.org/draft-07/schema#";
var $id = "https://example.com/json-api-request.schema.json";
var description = "CUD specs for JSON:API request. See: https://jsonapi.org/format/#crud";
var title = "JSON:API Request";
var oneOf = [
	{
		$ref: "#/definitions/createRequest"
	}
];
var definitions = {
	attributes: {
		type: "object",
		additionalProperties: true
	},
	ref: {
		type: "object",
		required: [
			"type",
			"id"
		],
		properties: {
			type: {
				type: "string"
			},
			id: {
				type: "string"
			}
		}
	},
	relationships: {
		type: "object",
		additionalProperties: {
			type: "object",
			properties: {
				data: {
					oneOf: [
						{
							$ref: "#/definitions/ref"
						},
						{
							type: "array",
							items: {
								$ref: "#/definitions/ref"
							}
						}
					]
				}
			}
		}
	},
	createResource: {
		type: "object",
		required: [
			"type"
		],
		properties: {
			type: {
				type: "string"
			},
			id: {
				type: "string"
			},
			attributes: {
				$ref: "#/definitions/attributes"
			},
			relationships: {
				$ref: "#/definitions/relationships"
			}
		}
	},
	createRequest: {
		type: "object",
		required: [
			"data"
		],
		properties: {
			data: {
				$ref: "#/definitions/createResource"
			}
		}
	}
};
var jsonApiRequestSchema = {
	$schema: $schema,
	$id: $id,
	description: description,
	title: title,
	oneOf: oneOf,
	definitions: definitions
};

const ajv = new Ajv();
addFormats(ajv);
const validateRequestSchema = ajv.compile(jsonApiRequestSchema);

/**
 * Validates a JSON:API request against schema and format requirements
 * @param {import("@data-prism/core").Schema} schema - The schema defining resources
 * @param {*} body - The request body to validate
 * @returns {Array|undefined} Array of validation errors, or undefined if valid
 */
function validateRequest(schema, body) {
	const valid = validateRequestSchema(body);

	if (!valid) {
		return validateRequestSchema.errors.map((err) => ({
			status: "400",
			title: "Invalid request",
			description:
				"The request failed to pass the JSON:API schema validator. See meta for output.",
			meta: err,
		}));
	}

	const { data } = body;
	if (!data) {
		return [
			{
				status: "400",
				title: "Invalid resource",
				description: "Request body must contain a 'data' property",
			},
		];
	}

	if (!(data.type in schema.resources)) {
		return [
			{
				status: "400",
				title: "Invalid resource",
				description: `${data.type} is not a valid resource type`,
			},
		];
	}
}

/**
 * @typedef {Object} Ref
 * @property {string} type - Resource type
 * @property {string} id - Resource ID
 */

/**
 * @typedef {Object} CreateRequest
 * @property {Object} data - The resource data
 * @property {string} data.type - Resource type
 * @property {string} [data.id] - Resource ID
 * @property {Object.<string, unknown>} [data.attributes] - Resource attributes
 * @property {Object.<string, Ref|Ref[]>} [data.relationships] - Resource relationships
 */

/**
 * Creates a JSON:API create handler
 * @param {import("@data-prism/core").Schema} schema - The schema defining resources
 * @param {*} store - The data store instance
 * @returns {(req: any, res: any) => Promise<void>} Express request handler
 */
function create(schema, store) {
	return async (req, res) => {
		const { body } = req;
		const validationErrors = validateRequest(schema, body);
		if (validationErrors) {
			res.statusCode = 400;
			res.send({ errors: validationErrors });
			return;
		}

		try {
			const { data: resource } = req.body;
			const normalized = {
				...resource,
				relationships: esToolkit.mapValues(
					resource.relationships ?? {},
					(rel) => rel.data,
				),
			};

			const out = await store.create(normalized);
			res.statusCode = 201;
			res.json({
				data: {
					...out,
					relationships: esToolkit.mapValues(out.relationships, (rel) => ({ data: rel })),
				},
			});
		} catch (err) {
			console.log(err);
			res.statusCode = 500;
			res.send("something went wrong");
		}
	};
}

/**
 * Creates a JSON:API PATCH handler for updating resources
 * @param {*} store - The data store instance
 * @returns {(req: any, res: any) => Promise<void>} Express request handler
 */
function update(store) {
	return async (req, res) => {
		try {
			const { data: resource } = req.body;
			const normalized = {
				...resource,
				relationships: esToolkit.mapValues(
					resource.relationships ?? {},
					(rel) => rel.data,
				),
			};

			const out = await store.update(normalized);
			res.statusCode = 200;
			res.json({
				data: {
					...out,
					relationships: esToolkit.mapValues(out.relationships, (rel) => ({ data: rel })),
				},
			});
		} catch (err) {
			console.log(err);
			res.statusCode = 500;
			res.send("something went wrong");
		}
	};
}

/**
 * Creates a JSON:API DELETE handler for a specific resource type
 * @param {string} type - The resource type to handle
 * @param {*} store - The data store instance
 * @returns {(req: any, res: any) => Promise<void>} Express request handler
 */
function deleteHandler(type, store) {
	return async (req, res) => {
		try {
			const { id } = req.params;

			await store.delete({ type, id });

			res.statusCode = 204;
			res.send("check");
		} catch (err) {
			console.log(err);
			res.statusCode = 500;
			res.send("something went wrong");
		}
	};
}

/**
 * Creates a JSON:API GET handler for a specific resource type
 * @param {import("@data-prism/core").Schema} schema - The schema defining resources
 * @param {*} store - The data store instance
 * @param {string} type - The resource type to handle
 * @returns {(req: any, res: any) => Promise<void>} Express request handler
 */
function get(schema, store, type) {
	return async (req, res) => {
		try {
			const query = parseRequest(schema, {
				...req.query,
				type,
				id: req.params.id,
			});
			const result = await store.query(query);
			const response = formatResponse(schema, query, result);
			res.json(response);
		} catch {
			res.statusCode = 500;
			res.send("something went wrong");
		}
	};
}

/**
 * @typedef {Object} Options
 * @property {number} [port] - Port number for the server
 */

/**
 * @typedef {Object} Server
 * @property {(type: string) => (req: any, res: any) => Promise<void>} getAllHandler - Handler for GET /resource requests
 * @property {(type: string) => (req: any, res: any) => Promise<void>} getOneHandler - Handler for GET /resource/:id requests
 * @property {(type: string) => (req: any, res: any) => Promise<void>} createHandler - Handler for POST /resource requests
 * @property {(type: string) => (req: any, res: any) => Promise<void>} updateHandler - Handler for PATCH /resource/:id requests
 * @property {(type: string) => (req: any, res: any) => Promise<void>} deleteHandler - Handler for DELETE /resource/:id requests
 */

/**
 * Creates JSON:API request handlers for a schema and store
 * @param {import("@data-prism/core").Schema} schema - The schema defining resources
 * @param {*} store - The data store instance
 * @returns {Server} Object with handler functions for each HTTP method
 */
function createJSONAPIHandlers(schema, store) {
	return {
		getAllHandler: (type) => get(schema, store, type),
		getOneHandler: (type) => get(schema, store, type),
		createHandler: () => create(schema, store),
		updateHandler: () => update(store),
		deleteHandler: (type) => deleteHandler(type, store),
	};
}

/**
 * Applies JSON:API routes to an Express app based on schema resources
 * @param {import("@data-prism/core").Schema} schema - The schema defining resources
 * @param {*} store - The data store instance
 * @param {*} app - Express app instance
 */
function applySchemaRoutes(schema, store, app) {
	const server = createJSONAPIHandlers(schema, store);

	Object.keys(schema.resources).forEach((type) => {
		app.get(`/${type}`, server.getAllHandler(type));
		app.get(`/${type}/:id`, server.getOneHandler(type));
		app.post(`/${type}`, server.createHandler(type));
		app.patch(`/${type}/:id`, server.updateHandler(type));
		app.delete(`/${type}/:id`, server.deleteHandler(type));
	});
}

/**
 * Creates a complete Express server with JSON:API endpoints
 * @param {import("@data-prism/core").Schema} schema - The schema defining resources
 * @param {*} store - The data store instance
 * @param {Options} [options={}] - Server configuration options
 */
function createServer(schema, store, options = {}) {
	const app = express();
	app.use(express.json());
	const { port = 3000 } = options;

	applySchemaRoutes(schema, store, app);

	app.get("/", (req, res) => {
		res.send("OK");
	});

	app.listen(port, "0.0.0.0", () => {
		console.log(`running on port ${port}`);
	});
}

exports.applySchemaRoutes = applySchemaRoutes;
exports.createJSONAPIHandlers = createJSONAPIHandlers;
exports.createServer = createServer;
exports.formatResponse = formatResponse;
exports.parseRequest = parseRequest;
