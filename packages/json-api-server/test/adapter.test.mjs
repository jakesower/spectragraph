import test from "ava";
import { makeMemoryStore } from "@polygraph/memory-store";
import { careBearSchema as schema } from "./fixtures/care-bear-schema.mjs";
import { careBearData } from "./fixtures/care-bear-data.mjs";
import { JsonApiAdapter } from "../src/api.mjs";

const nameLengthSorter = (leftName, rightName) => leftName.length - rightName.length;
const nameLengthAndYearSorter = (left, right) =>
  left.name.length - left.year_introduced - (right.name.length - right.year_introduced);

test.beforeEach(async (t) => {
  const store = await makeMemoryStore(schema, {
    initialData: careBearData,
    orderingFunctions: { nameLengthAndYearSorter, nameLengthSorter },
  });

  const api = JsonApiAdapter(schema, store);

  // eslint-disable-next-line no-param-reassign
  t.context = { api };
});

test("gets all the resources of a type at the resources URL", async (t) => {
  const result = await t.context.api.get({
    params: { type: "bears" },
  });

  t.deepEqual(result, {
    data: [
      { type: "bears", id: "1" },
      { type: "bears", id: "2" },
      { type: "bears", id: "3" },
      { type: "bears", id: "5" },
    ],
  });
});

test("gets a resource by type and id", async (t) => {
  const result = await t.context.api.get({
    params: { type: "bears", id: "1" },
  });

  t.deepEqual(result, {
    data: { type: "bears", id: "1" },
  });
});

test("gets nothing for a nonexistent resource by type and id", async (t) => {
  const result = await t.context.api.get({
    params: { type: "bears", id: "6" },
  });

  t.deepEqual(result, {
    data: null,
  });
});

test.only("fetches a single resource with a many-to-one relationship", async (t) => {
  const q = {
    params: {
      type: "bears",
      id: "1",
      include: "home",
    },
  };

  const result = await t.context.api.get(q);

  t.deepEqual(result, {
    data: {
      id: "1",
      type: "bears",
      relationships: {
        home: { data: { type: "homes", id: "1" } },
      },
    },
    included: [
      {
        type: "homes",
        id: "1",
      },
    ],
  });
});

test("a single resource with a one-to-many relationship", async (t) => {
  const q = {
    params: {
      type: "homes",
      id: "1",
      include: "bears",
    },
  };

  const result = await t.context.api.get(q);

  t.deepEqual(result, {
    data: { type: "homes", id: "1" },
    included: ["1", "2", "3"].map((id) => ({ type: "bears", id })),
  });
});

test("fetches a single resource with a subset of props", async (t) => {
  const result = await t.context.api.get({
    params: {
      type: "bears",
      id: "1",
      fields: {
        bears: ["name", "fur_color"],
      },
    },
  });

  t.deepEqual(result, {
    data: {
      type: "bears",
      id: "1",
      attributes: { name: "Tenderheart Bear", fur_color: "tan" },
    },
  });
});

test("fetches a single resource with a subset of props on a relationship", async (t) => {
  const q = {
    params: {
      type: "bears",
      id: "1",
      include: "home",
      fields: {
        homes: ["caring_meter"],
      },
    },
  };

  const result = await t.context.api.get(q);

  t.deepEqual(result, {
    data: { type: "bears", id: "1" },
    included: [{ type: "homes", id: "1", attributes: { caring_meter: 1 } }],
  });
});

test.only("fetches a single resource with many-to-many relationship", async (t) => {
  const result = await t.context.api.get({
    params: {
      type: "bears",
      id: "1",
      include: "powers",
    },
  });

  t.deepEqual(result, {
    data: { type: "bears", id: "1" },
    included: [{ type: "powers", id: "careBearStare" }],
  });
});

test.skip("fetches multiple sub queries of various types", async (t) => {
  const result = await t.context.store.get({
    params: {
      type: "homes",
      id: "1",
      include: "home,home.bears,powers",
    },
  });

  t.deepEqual(result, {
    data: {
      type: "bears",
      id: "1",
      relationships: {
        home: {
          data: { type: "homes", id: "1" },
        },
        powers: { data: [{ type: "powers", id: "careBearStare" }] },
      },
    },
    included: [
      {
        type: "homes",
        id: "1",
        relationships: {
          bears: { data: ["1", "2", "3"].map((id) => ({ type: "bears", id })) },
        },
      },
      {
        type: "powers",
        id: "careBearStare",
      },
    ],
  });
});

test.skip("handles sub queries between the same type", async (t) => {
  const result = await t.context.store.get({
    type: "bears",
    rels: {
      best_friend: {},
    },
  });

  t.deepEqual(result, [
    { id: "1", best_friend: null },
    { id: "2", best_friend: { id: "3" } },
    { id: "3", best_friend: { id: "2" } },
    { id: "5", best_friend: null },
  ]);
});

// test.only("fetches relationships as refs when used as props", async (t) => {
//   const result = await t.context.store.get({
//     type: "bears",
//     id: "1",
//     props: ["home"],
//   });

//   t.deepEqual(result, { id: "1", home: { id: "1", type: "homes" } });
// });

test.skip("fetches all props", async (t) => {
  const result = await t.context.store.get({
    type: "bears",
    id: "1",
    allProps: true,
  });

  t.deepEqual(result, omit(careBearData.bears[1], ["home", "best_friend", "powers"]));
});

test.skip("fetches all props except", async (t) => {
  const result = await t.context.store.get({
    type: "bears",
    id: "1",
    allProps: true,
    excludedProps: ["belly_badge"],
  });

  t.deepEqual(
    result,
    omit(careBearData.bears[1], ["belly_badge", "home", "best_friend", "powers"]),
  );
});

test.skip("fails validation for invalid types", async (t) => {
  const err = await t.throwsAsync(async () => {
    await t.context.store.get({ type: "bearz", id: "1" });
  });

  t.deepEqual(err.message, ERRORS.INVALID_GET_QUERY_SYNTAX);
});

test.skip("fails validation for invalid top level props", async (t) => {
  const err = await t.throwsAsync(async () => {
    await t.context.store.get({ type: "bears", id: "1", koopa: "troopa" });
  });

  t.deepEqual(err.message, ERRORS.INVALID_GET_QUERY_SYNTAX);
});

test.skip("validates without an id", async (t) => {
  const result = await t.context.store.get({ type: "bears" });
  t.assert(Array.isArray(result));
});
