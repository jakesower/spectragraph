import test from "ava";
import { schema } from "../../fixtures/care-bear-schema.mjs";
import { makeMemoryStore } from "../../../src/memory-store/memory-store.mjs";
import { careBearData } from "../../fixtures/care-bear-data.mjs";
import { PolygraphError } from "../../../src/validations/errors.mjs";
import { ERRORS } from "../../../src/strings.mjs";

test.beforeEach(async (t) => {
  // eslint-disable-next-line no-param-reassign
  t.context = {
    store: await makeMemoryStore(schema, {
      initialData: careBearData,
    }),
  };
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

test("errors for a bad limit", async (t) => {
  await t.throwsAsync(
    async () => {
      const badResult = await t.context.store.get({
        type: "bears",
        limit: 0,
      });

      console.log(badResult);
    },
    { instanceOf: PolygraphError, message: ERRORS.INVALID_GET_QUERY_SYNTAX },
  );
});

test("errors for a bad offset", async (t) => {
  await t.throwsAsync(
    async () => {
      const badResult = await t.context.store.get({
        type: "bears",
        limit: 3,
        offset: -1,
      });

      console.log(badResult);
    },
    { instanceOf: PolygraphError, message: ERRORS.INVALID_GET_QUERY_SYNTAX },
  );
});
