import test from "ava";
import Database from "better-sqlite3";
import { ERRORS, PolygraphError } from "@polygraph/core/errors";
import { careBearSchema as schema } from "../../fixtures/care-bear-schema.mjs";
import { SQLiteStore } from "../../../src/sqlite-store.mjs";
import { careBearData } from "../../fixtures/care-bear-data.mjs";
import { createTables, seed } from "../../../src/actions/seed.mjs";

// Test Setup
const sortResWithMemory = () => {
  const calls = [];
  const fn = (left, right) => {
    calls.push([left, right]);
    return left.localeCompare(right);
  };

  return { calls, fn };
};

test.beforeEach(async (t) => {
  const { calls: sortCalls, fn: memorySort } = sortResWithMemory();

  const db = Database(":memory:");
  createTables(schema, db);
  seed(schema, db, careBearData);

  const store = await SQLiteStore(schema, db, { orderingFunctions: { memorySort } });

  // eslint-disable-next-line no-param-reassign
  t.context = { sortCalls, store };
});

// order
test.skip("orders results before taking first", async (t) => {
  const result = await t.context.store.get({
    type: "bears",
    props: ["name", "year_introduced"],
    order: [{ property: "year_introduced", direction: "desc" }],
    first: true,
  });

  t.deepEqual(result, { id: "5", name: "Smart Heart Bear", year_introduced: 2005 });
});

// mutual exclusion
test.skip("limit is incompatible with first", async (t) => {
  await t.throwsAsync(
    async () => {
      const badResult = await t.context.store.get({
        type: "bears",
        limit: 3,
        first: true,
      });

      console.log(badResult);
    },
    { instanceOf: PolygraphError, message: ERRORS.INVALID_GET_QUERY_SYNTAX },
  );
});

test.skip("offset is incompatible with first", async (t) => {
  await t.throwsAsync(
    async () => {
      const badResult = await t.context.store.get({
        type: "bears",
        offset: 3,
        first: true,
      });

      console.log(badResult);
    },
    { instanceOf: PolygraphError, message: ERRORS.INVALID_GET_QUERY_SYNTAX },
  );
});

// optimizations -- these will need to be tested against much larger data sets
test.skip("only one pass through the ordering function is made when first is present", async (t) => {
  const result = await t.context.store.get({
    type: "bears",
    props: ["name"],
    order: [{ property: "name", direction: "asc", function: "memorySort" }],
    first: true,
  });

  t.deepEqual(result, { id: "2", name: "Cheer Bear" });
  t.deepEqual(t.context.sortCalls.length, 3);
});

test.skip("only one pass through the ordering function is made when first is present (descending)", async (t) => {
  const result = await t.context.store.get({
    type: "bears",
    props: ["name"],
    order: [{ property: "name", direction: "desc", function: "memorySort" }],
    first: true,
  });

  t.deepEqual(result, { id: "3", name: "Wish Bear" });
  t.deepEqual(t.context.sortCalls.length, 3);
});
