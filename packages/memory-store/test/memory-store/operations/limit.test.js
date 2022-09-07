import test from "ava";
import { ERRORS, BlossomError } from "@blossom-js/core/errors";
import { schema } from "../../fixtures/care-bear-schema.js";
import { MemoryStore } from "../../../src/memory-store.js";
import { careBearData } from "../../fixtures/care-bear-data.js";

test.beforeEach((t) => {
  // eslint-disable-next-line no-param-reassign
  t.context = { store: MemoryStore(schema).seed(careBearData) };
});

test("limits the number of returned values", async (t) => {
  const result = await t.context.store.get({
    type: "bears",
    props: ["name"],
    limit: 1,
  });

  t.deepEqual(result, [{ id: "1", name: "Tenderheart Bear" }]);
});

test("limits after sorting", async (t) => {
  const result = await t.context.store.get({
    type: "bears",
    props: ["name"],
    order: [{ property: "name", direction: "asc" }],
    limit: 2,
  });

  t.deepEqual(result, [
    { id: "2", name: "Cheer Bear" },
    { id: "5", name: "Smart Heart Bear" },
  ]);
});

test("limits after sorting with 1", async (t) => {
  const result = await t.context.store.get({
    type: "bears",
    props: ["name"],
    order: [{ property: "name", direction: "asc" }],
    limit: 1,
  });

  t.deepEqual(result, [{ id: "2", name: "Cheer Bear" }]);
});

test("limits with an offset", async (t) => {
  const result = await t.context.store.get({
    type: "bears",
    props: ["name"],
    order: [{ property: "name", direction: "asc" }],
    limit: 2,
    offset: 1,
  });

  t.deepEqual(result, [
    { id: "5", name: "Smart Heart Bear" },
    { id: "1", name: "Tenderheart Bear" },
  ]);
});

test("allows for offset only", async (t) => {
  const result = await t.context.store.get({
    type: "bears",
    props: ["name"],
    order: [{ property: "name", direction: "asc" }],
    offset: 1,
  });

  t.deepEqual(result, [
    { id: "5", name: "Smart Heart Bear" },
    { id: "1", name: "Tenderheart Bear" },
    { id: "3", name: "Wish Bear" },
  ]);
});

test("allows for limit + offset to exceed size of data", async (t) => {
  const result = await t.context.store.get({
    type: "bears",
    props: ["name"],
    order: [{ property: "name", direction: "asc" }],
    limit: 6,
    offset: 2,
  });

  t.deepEqual(result, [
    { id: "1", name: "Tenderheart Bear" },
    { id: "3", name: "Wish Bear" },
  ]);
});

test("returns nothing when the offset has surpassed the data size", async (t) => {
  const result = await t.context.store.get({
    type: "bears",
    props: ["name"],
    order: [{ property: "name", direction: "asc" }],
    limit: 6,
    offset: 20,
  });

  t.deepEqual(result, []);
});

test("allows a zero offset", async (t) => {
  const result = await t.context.store.get({
    type: "bears",
    props: ["name"],
    order: [{ property: "name", direction: "asc" }],
    offset: 0,
  });

  t.deepEqual(result, [
    { id: "2", name: "Cheer Bear" },
    { id: "5", name: "Smart Heart Bear" },
    { id: "1", name: "Tenderheart Bear" },
    { id: "3", name: "Wish Bear" },
  ]);
});

test("errors for a bad limit", async (t) => {
  await t.throwsAsync(
    async () => {
      await t.context.store.get({
        type: "bears",
        limit: 0,
      });
    },
    { instanceOf: BlossomError, message: ERRORS.INVALID_GET_QUERY_SYNTAX },
  );
});

test("errors for a bad offset", async (t) => {
  await t.throwsAsync(
    async () => {
      await t.context.store.get({
        type: "bears",
        limit: 3,
        offset: -1,
      });
    },
    { instanceOf: BlossomError, message: ERRORS.INVALID_GET_QUERY_SYNTAX },
  );
});
