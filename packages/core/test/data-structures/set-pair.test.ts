import { pick } from "@polygraph/utils";
import test from "ava";
import { makeSetPair } from "../../src/data-structures/set-pair";
import { careBearData } from "../fixtures/care-bear-data";

const noop = () => {}; // eslint-disable-line @typescript-eslint/no-empty-function
const bearsWithId = (ids: string[]) => ids.map((id) => careBearData.bears[id]);
const getId = (res) => res.id;

const makeResPair = (leftRess, rightRess) => makeSetPair(leftRess, rightRess, getId, getId);

const bears12 = () => bearsWithId(["1", "2"]);
const bears23 = () => bearsWithId(["2", "3"]);

test("left/right appear identical to arguments passed in", (t) => {
  const pair = makeResPair(bears12(), bears23());
  t.deepEqual(pair.left, bears12());
  t.deepEqual(pair.right, bears23());
});

test("left can use forEach", (t) => {
  const checks = [];
  const pair = makeResPair(bears12(), bears23());
  pair.left.forEach((item) => {
    checks.push(item.properties.name);
  });

  t.deepEqual(checks, bears12().map((bear) => bear.properties.name));
});

test("right can use forEach", (t) => {
  const checks = [];
  const pair = makeResPair(bears12(), bears23());
  pair.right.forEach((item) => {
    checks.push(item.properties.name);
  });

  t.deepEqual(checks, bears23().map((bear) => bear.properties.name));
});

test("multiple calls to forEach work normally", (t) => {
  const checks = [];
  const pair = makeResPair(bears12(), bears23());
  pair.left.forEach((item) => {
    checks.push(item.properties.name);
  });
  pair.left.forEach((_, idx) => {
    checks.push(idx);
  });

  t.deepEqual(checks, [...bears12().map((bear) => bear.properties.name), 0, 1]);
});

test("right can use map", (t) => {
  const pair = makeResPair(bears12(), bears23());
  const mapped = pair.right.map((item) => item.properties.name.length);

  t.deepEqual(mapped, [10, 9]);
});

test("left can use find", (t) => {
  const pair = makeSetPair([1, 2], [2, 3], (x) => x, (y) => y);
  const found = pair.left.find((x) => x % 2 === 0);

  t.deepEqual(found, 2);
});

test("leftOnly can map", (t) => {
  const pair = makeSetPair([1, 2], [2, 3], (x) => x, (y) => y);
  const mapped = pair.leftOnly.map((x) => x * 2);

  t.deepEqual(mapped, [2]);
});

test("leftOnly can find", (t) => {
  const pair = makeSetPair([1, 2], [2, 3], (x) => x, (y) => y);
  const found = pair.leftOnly.find((x) => x % 2 === 0);

  t.deepEqual(found, undefined);
});

test("leftIntersection can map", (t) => {
  const pair = makeSetPair([1, 2], [2, 3], (x) => x, (y) => y);
  const mapped = pair.leftIntersection.map((x) => x * 2);

  t.deepEqual(mapped, [4]);
});

test("leftIntersection can find", (t) => {
  const pair = makeSetPair([1, 2], [2, 3], (x) => x, (y) => y);
  const found = pair.leftIntersection.find((x) => x % 2 === 0);

  t.deepEqual(found, 2);
});

test("left executes the left comparable calculator when mapped", (t) => {
  const leftsCompared = [];
  const leftCalculator = (x) => {
    leftsCompared.push(x);
    return x;
  };

  const pair = makeSetPair([1, 2], [2, 3], leftCalculator, (y) => y);
  pair.left.map((item) => item);

  t.deepEqual(leftsCompared, [1, 2]);
});

test("left doesn't execute the left comparable calculator when mapped", (t) => {
  const leftsCompared = [];
  const leftCalculator = (x) => {
    leftsCompared.push(x);
    return x;
  };

  const pair = makeSetPair([1, 2], [2, 3], leftCalculator, (y) => y);
  pair.left.find((item) => item);

  t.deepEqual(leftsCompared, []);
});

test("left executes the left comparable calculator only once when mapped twice", (t) => {
  const leftsCompared = [];
  const leftCalculator = (x) => {
    leftsCompared.push(x);
    return x;
  };

  const pair = makeSetPair([1, 2], [2, 3], leftCalculator, (y) => y);
  pair.left.map((item) => item);
  pair.left.map((item) => item);

  t.deepEqual(leftsCompared, [1, 2]);
});

test("right doesn't execute the left comparable calculator when mapped", (t) => {
  const leftsCompared = [];
  const leftCalculator = (x) => {
    leftsCompared.push(x);
    return x;
  };

  const pair = makeSetPair([1, 2], [2, 3], leftCalculator, (y) => y);
  pair.right.map((item) => item);

  t.deepEqual(leftsCompared, []);
});

test("comparable calculators are only called once when calling left and right multiple times with map/forEach", (t) => {
  const leftsCompared = [];
  const rightsCompared = [];
  const leftCalculator = (x) => {
    leftsCompared.push(x);
    return x;
  };
  const rightCalculator = (x) => {
    rightsCompared.push(x);
    return x;
  };

  const pair = makeSetPair([1, 2], [2, 3], leftCalculator, rightCalculator);
  pair.left.map((item) => item);
  pair.right.map((item) => item);
  pair.left.map((item) => item);
  pair.right.forEach(noop);

  t.deepEqual(leftsCompared, [1, 2]);
  t.deepEqual(rightsCompared, [2, 3]);
});

test.only("comparable calculators are only called once when calling intersections with map/forEach", (t) => {
  const leftsCompared = [];
  const rightsCompared = [];
  const leftCalculator = (x) => {
    leftsCompared.push(x);
    return x;
  };
  const rightCalculator = (x) => {
    rightsCompared.push(x);
    return x;
  };

  const pair = makeSetPair([1, 2], [2, 3], leftCalculator, rightCalculator);
  pair.leftIntersection.map((item) => item);
  t.deepEqual(leftsCompared, [1, 2]);
  t.deepEqual(rightsCompared, [2, 3]);

  pair.right.map((item) => item);
  pair.left.map((item) => item);
  pair.rightIntersection.map(noop);

  t.deepEqual(leftsCompared, [1, 2]);
  t.deepEqual(rightsCompared, [2, 3]);
});

test("comparable calculators not called once when calling left and right multiple times with find", (t) => {
  const leftsCompared = [];
  const rightsCompared = [];
  const leftCalculator = (x) => {
    leftsCompared.push(x);
    return x;
  };
  const rightCalculator = (x) => {
    rightsCompared.push(x);
    return x;
  };

  const pair = makeSetPair([1, 2], [2, 3], leftCalculator, rightCalculator);
  pair.left.find((item) => item);
  pair.right.find((item) => item);
  pair.left.find((item) => item);
  pair.right.find(noop);

  t.deepEqual(leftsCompared, []);
  t.deepEqual(rightsCompared, []);
});

test("comparable calculators called once when calling diffs multiple times with find", (t) => {
  const leftsCompared = [];
  const rightsCompared = [];
  const leftCalculator = (x) => {
    leftsCompared.push(x);
    return x;
  };
  const rightCalculator = (x) => {
    rightsCompared.push(x);
    return x;
  };

  const pair = makeSetPair([1, 2], [2, 3], leftCalculator, rightCalculator);
  pair.leftOnly.find((item) => item);
  pair.rightOnly.find((item) => item);
  pair.leftOnly.find((item) => item);
  pair.rightOnly.find(noop);

  t.deepEqual(leftsCompared, [1, 2]);
  t.deepEqual(rightsCompared, [2, 3]);
});
