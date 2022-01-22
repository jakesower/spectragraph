import anyTest, { TestInterface } from "ava";
import { pick } from "@polygraph/utils";
import { schema } from "../fixtures/care-bear-schema";
import { makeMemoryStore } from "../../src/memory-store";
import { careBearData } from "../fixtures/care-bear-data";

// Helper functions
const test = anyTest;

const resource = (
  type,
  id,
  getRels,
  overrides,
) => {
  const stored = careBearData[type][id];
  const resDef = schema.resources[type];
  const props = pick(stored, Object.keys(resDef.properties));
  const rels = pick(stored, Object.keys(resDef.relationships));

  return {
    id,
    ...props,
    ...(getRels ? rels : {}),
    ...overrides,
  };
};

// Test Setup

test.beforeEach(async (t) => {
  // eslint-disable-next-line no-param-reassign
  t.context = { store: await makeMemoryStore(schema, { initialData: careBearData }) };
});

// Actual Tests

test("fetches a single resource", async (t) => {
  const result = await t.context.store.get({ type: "bears", id: "1" });

  t.deepEqual(result, resource("bears", "1"));
});

test("does not fetch a nonexistent resource", async (t) => {
  const result = await t.context.store.get({ type: "bears", id: "6" });

  t.deepEqual(result, null);
});

test("fetches multiple resources", async (t) => {
  const result = await t.context.store.get({ type: "bears" });
  const expected = ["1", "2", "3", "5"].map((id) => resource("bears", id));

  t.deepEqual(result, expected);
});

test("fetches a single resource specifying no relationships desired", async (t) => {
  const result = await t.context.store.get({ type: "bears", id: "1", relationships: {} });

  t.deepEqual(result, resource("bears", "1", false));
});

test("fetches a single resource with a single relationship", async (t) => {
  const q = {
    type: "bears",
    id: "1",
    relationships: { home: {} },
  };

  const result = await t.context.store.get(q);

  t.deepEqual(result, resource("bears", "1", false, { home: resource("homes", "1") }));
});

test("fetches a single resource with a subset of properties", async (t) => {
  const result = await t.context.store.get({
    type: "bears",
    id: "1",
    properties: ["name", "fur_color"],
    relationships: {},
  });

  t.deepEqual(
    result,
    {
      id: "1", name: "Tenderheart Bear", fur_color: "tan",
    },
  );
});

// TODO: make types work on nested relationship properties, e.g. result.bears.home.name shouldn't exist
test("fetches a single resource with a subset of properties on a relationship", async (t) => {
  const q = {
    type: "bears",
    id: "1",
    relationships: { home: { properties: ["caring_meter"] } },
  };

  const result = await t.context.store.get(q);

  t.like(
    result,
    resource("bears", "1", false, {
      home: {
        id: "1",
        caring_meter: 1,
      },
    }),
  );
});

test("fetches a single resource with many-to-many relationship", async (t) => {
  const result = await t.context.store.get({
    type: "bears",
    id: "1",
    relationships: { powers: {} },
  });

  t.deepEqual(
    result,
    resource("bears", "1", false, { powers: [resource("powers", "careBearStare")] }),
  );
});

test("fetches multiple relationships of various types", async (t) => {
  const result = await t.context.store.get({
    type: "bears",
    id: "1",
    relationships: {
      home: {
        relationships: {
          bears: {},
        },
      },
      powers: {},
    },
  });

  t.deepEqual(result, resource("bears", "1", false, {
    home: resource("homes", "1", false, {
      bears: ["1", "2", "3"].map((id) => resource("bears", id)),
    }),
    powers: [resource("powers", "careBearStare")],
  }));
});

test("handles relationships between the same type", async (t) => {
  const result = await t.context.store.get({
    type: "bears",
    relationships: {
      best_friend: {},
    },
  });

  t.deepEqual(result, [
    resource("bears", "1", false, { best_friend: null }),
    resource("bears", "2", false, { best_friend: resource("bears", "3") }),
    resource("bears", "3", false, { best_friend: resource("bears", "2") }),
    resource("bears", "5", false, { best_friend: null }),
  ]);
});
