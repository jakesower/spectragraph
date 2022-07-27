import test from "ava";
import Database from "better-sqlite3";
import { ERRORS, PolygraphError } from "@polygraph/core/errors";
import { careBearSchema as schema } from "../../fixtures/care-bear-schema.mjs";
import { SQLiteStore } from "../../../src/sqlite-store.mjs";
import { careBearData } from "../../fixtures/care-bear-data.mjs";
import { createTables, seed } from "../../../src/actions/seed.mjs";

// Test Setup
test.beforeEach(async (t) => {
  const db = Database(":memory:");
  createTables(schema, db);
  seed(schema, db, careBearData);

  const store = await SQLiteStore(schema, db);

  // eslint-disable-next-line no-param-reassign
  t.context = { store };
});

test("limits the number of returned values", async (t) => {
  const result = await t.context.store.get({
    type: "bears",
    props: ["name"],
    limit: 1,
  });

  t.deepEqual(result, [{ id: "1", name: "Tenderheart Bear" }]);
});

// INCLUDES SORTING

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
    { instanceOf: PolygraphError, message: ERRORS.INVALID_GET_QUERY_SYNTAX },
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
    { instanceOf: PolygraphError, message: ERRORS.INVALID_GET_QUERY_SYNTAX },
  );
});

test("limits subquery results", async (t) => {
  const result = await t.context.store.get({
    type: "homes",
    relationships: {
      bears: {
        limit: 1,
      },
    },
  });

  t.deepEqual(result, [
    { id: "1", bears: [{ id: "1" }] },
    { id: "2", bears: [] },
    { id: "3", bears: [] },
  ]);
});
