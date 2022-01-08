import test from "ava";
import { omit, pick } from "@polygraph/utils";
import { schema } from "../fixtures/care-bear-schema";
import { queryTree } from "../../src/utils";
import { NormalResourceOfType, Query } from "../../src/types";
import { careBearData } from "../fixtures/care-bear-data";
import { QueryTree } from "../../src/utils/query-tree";

type S = typeof schema;

const bearsWithHomeQuery = {
  $type: "bears",
  $id: "1",
  $relationships: {
    home: {},
  },
} as const;

const resToTree = (res) => ({
  id: res.$id,
  ...res.$properties,
  ...res.$relationships,
});
const lookupTree = ({ $type, $id }) => resToTree(careBearData[$type][$id]);

const tenderheart = careBearData.bears[1] as NormalResourceOfType<S, "bears">;
const tenderheartTree = {
  ...resToTree(tenderheart),
  home: lookupTree(tenderheart.$relationships.home),
  powers: tenderheart.$relationships.powers.map(lookupTree),
  best_friend: null,
};

const bearWithHomeAndPowersTree = {
  id: "1",
  name: tenderheart.$properties.name,
  belly_badge: tenderheart.$properties.belly_badge,
  home: lookupTree(tenderheart.$relationships.home),
  powers: tenderheart.$relationships.powers.map(lookupTree),
  best_friend: null,
};

test.only("considers all present fields when the query doesn't specify", async (t) => {
  const qt = queryTree(schema, { $type: "bears", $id: "1" }, bearWithHomeAndPowersTree);
  const expected = {
    ...tenderheart,
    $properties: {
      name: tenderheart.$properties.name,
      belly_badge: tenderheart.$properties.belly_badge,
    },
  };

  t.deepEqual(qt.rootResource, expected);
});

test("only considers properties included in the query, when specified", async (t) => {
  const qt = queryTree(
    schema,
    {
      $type: "bears",
      id: "1",
      $properties: ["name"],
    },
    bearWithHomeAndPowersTree,
  );

  const expected = {
    ...tenderheart,
    $properties: pick(tenderheartTree, ["name"]),
  };

  t.deepEqual(qt.rootResource, expected);
});

test("gathers no properties when key is empty array", async (t) => {
  const qt = queryTree(
    schema,
    {
      $type: "bears",
      $id: "1",
      $properties: [],
    },
    bearWithHomeAndPowersTree,
  );

  const expected = {
    ...tenderheart,
    $properties: {},
  };

  t.deepEqual(qt.rootResource, expected);
});

test("only considers properties included in the both the query and the tree", async (t) => {
  const qt = queryTree(
    schema,
    {
      $type: "bears",
      $id: "1",
      $properties: ["name", "belly_badge"],
    },
    omit(bearWithHomeAndPowersTree, ["name"]),
  );

  const expected = {
    ...tenderheart,
    $properties: { belly_badge: "heart" },
  } as any;

  t.deepEqual(qt.rootResource, expected);
});

test("omits relationships when empty object is provided", async (t) => {
  const qt = queryTree(schema, bearsWithHomeQuery, bearWithHomeAndPowersTree);
  const expected = {
    ...tenderheart,
    $properties: pick(tenderheart.$properties, ["name", "belly_badge"]),
    $relationships: pick(tenderheart.$relationships, ["home"]),
  };

  t.deepEqual(qt.rootResource, expected);
});

test("only considers relationships included in the query, when specified", async (t) => {
  const qt = queryTree(schema, { $type: "bears", $id: "1", $relationships: {} }, bearWithHomeAndPowersTree);
  const expected = {
    ...tenderheart,
    $properties: pick(tenderheart.$properties, ["name", "belly_badge"]),
    $relationships: {},
  };

  t.deepEqual(qt.rootResource, expected);
});

test("finds descendants properly", async (t) => {
  const tree = {
    ...lookupTree({ $type: "bears", $id: "1" }),
    home: {
      ...lookupTree({ $type: "homes", $id: "1" }),
      bears: careBearData.homes["1"].$relationships.bears.map(lookupTree),
    },
    best_friend: null,
    powers: careBearData.bears["1"].$relationships.powers.map((power) => ({
      ...lookupTree({ $type: "powers", $id: power.$id }),
      bears: careBearData.powers[power.$id].$relationships.bears.map(lookupTree),
    })),
  };

  const qt = queryTree(
    schema,
    {
      $type: "bears",
      $id: "1",
      $relationships: { home: {}, powers: {}, best_friend: {} },
    },
    tree,
  );
  const expected = [
    tenderheart,
    careBearData.homes[1],
    ...[careBearData.powers.careBearStare],
  ];

  const allResources = [];
  qt.forEachResource((res) => { allResources.push(res); });

  t.deepEqual(allResources, expected);
});
