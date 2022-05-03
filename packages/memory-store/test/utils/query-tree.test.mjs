import test from "ava";
import { omit, pick } from "@polygraph/utils";
import { schema } from "../fixtures/care-bear-schema.mjs";
import { queryTree } from "../../src/utils/query-tree.mjs";
import { careBearData } from "../fixtures/care-bear-data.mjs";

const deref = ({ type, id }) => careBearData[type][id];
const normalize = (type, res, rels = null) => {
  const schemaDef = schema.resources[type];
  const relationships = pick(res, rels ?? Object.keys(schemaDef.relationships));
  return {
    type,
    id: res.id,
    properties: pick(res, Object.keys(schemaDef.properties)),
    relationships,
  };
};

const tenderheart = careBearData.bears[1];
const bearWithHomeAndPowersTree = {
  id: "1",
  name: tenderheart.name,
  belly_badge: tenderheart.belly_badge,
  fur_color: "tan",
  year_introduced: 1982,
  home: deref(tenderheart.home),
  powers: tenderheart.powers.map(deref),
  best_friend: null,
};

test("considers no fields when the query doesn't specify", async (t) => {
  const qt = queryTree(schema, { type: "bears", id: "1" }, bearWithHomeAndPowersTree);
  const expected = {
    ...normalize("bears", tenderheart),
    properties: {},
    relationships: {},
  };

  t.deepEqual(qt.rootResource, expected);
});

test("only considers properties included in the query, when specified", async (t) => {
  const qt = queryTree(
    schema,
    {
      type: "bears",
      id: "1",
      properties: ["name"],
    },
    bearWithHomeAndPowersTree,
  );

  const expected = {
    ...normalize("bears", tenderheart),
    properties: pick(tenderheart, ["name"]),
    relationships: {},
  };

  t.deepEqual(qt.rootResource, expected);
});

test("considers all fields when the query requests them", async (t) => {
  const qt = queryTree(schema, { type: "bears", id: "1", allNonRefProps: true }, bearWithHomeAndPowersTree);
  const expected = {
    ...normalize("bears", tenderheart, {}),
  };

  t.deepEqual(qt.rootResource, expected);
});

test("gathers no properties when key is empty array", async (t) => {
  const qt = queryTree(
    schema,
    {
      type: "bears",
      id: "1",
      properties: [],
    },
    bearWithHomeAndPowersTree,
  );

  const expected = {
    ...normalize("bears", tenderheart),
    properties: {},
    relationships: {},
  };

  t.deepEqual(qt.rootResource, expected);
});

test("only considers properties included in the both the query and the tree", async (t) => {
  const qt = queryTree(
    schema,
    {
      type: "bears",
      id: "1",
      properties: ["name", "belly_badge"],
    },
    omit(bearWithHomeAndPowersTree, ["name"]),
  );

  const expected = {
    ...normalize("bears", tenderheart),
    properties: { belly_badge: tenderheart.belly_badge },
    relationships: {},
  };

  t.deepEqual(qt.rootResource, expected);
});

test("omits relationships when empty object is provided", async (t) => {
  const qt = queryTree(
    schema,
    {
      type: "bears",
      id: "1",
      properties: [],
      relationships: { home: {} },
    },
    bearWithHomeAndPowersTree,
  );
  const expected = {
    ...normalize("bears", tenderheart),
    properties: {},
    relationships: {
      home: { type: "homes", id: "1" },
    },
  };

  t.deepEqual(qt.rootResource, expected);
});

test("only considers relationships included in the query, when specified", async (t) => {
  const qt = queryTree(schema, { type: "bears", id: "1", relationships: {} }, bearWithHomeAndPowersTree);
  const expected = {
    ...normalize("bears", tenderheart),
    properties: {},
    relationships: {},
  };

  t.deepEqual(qt.rootResource, expected);
});

test("finds descendants properly", async (t) => {
  const tree = {
    ...deref({ type: "bears", id: "1" }),
    home: {
      ...deref({ type: "homes", id: "1" }),
      bears: careBearData.homes["1"].bears.map(deref),
    },
    best_friend: null,
    powers: tenderheart.powers.map((power) => ({
      ...deref({ type: "powers", id: power.id }),
      relationships: {
        ...deref({ type: "powers", id: power.id }),
        bears: careBearData.powers[power.id].bears.map(deref),
      },
    })),
  };

  const qt = queryTree(
    schema,
    {
      type: "bears",
      id: "1",
      relationships: { home: { allNonRefProps: true }, powers: {}, best_friend: {} },
    },
    tree,
  );

  const expected = [
    { ...normalize("bears", tenderheart), properties: {} },
    normalize("homes", careBearData.homes[1], []),
    ...[careBearData.powers.careBearStare].map(
      (res) => ({ ...normalize("powers", res, []), properties: {} }),
    ),
  ];

  const allResources = [];
  qt.forEachResource((res) => { allResources.push(res); });

  t.deepEqual(allResources, expected);
});
