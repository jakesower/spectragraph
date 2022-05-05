import test from "ava";
import { schema } from "../../fixtures/care-bear-schema.mjs";
import { makeMemoryStore } from "../../../src/memory-store/memory-store.mjs";
import { careBearData } from "../../fixtures/care-bear-data.mjs";
import { PolygraphError } from "../../../src/validations/errors.mjs";
import { ERRORS } from "../../../src/strings.mjs";

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

  // eslint-disable-next-line no-param-reassign
  t.context = {
    sortCalls,
    store: await makeMemoryStore(schema, {
      initialData: careBearData,
      orderingFunctions: { memorySort },
    }),
  };
});

// order
test("orders results before taking first", async (t) => {
  const result = await t.context.store.get({
    type: "bears",
    props: ["name", "year_introduced"],
    order: [{ property: "year_introduced", direction: "desc" }],
    first: true,
  });

  t.deepEqual(result, { id: "5", name: "Smart Heart Bear", year_introduced: 2005 });
});

// mutual exclusion
test("limit is incompatible with first", async (t) => {
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

test("offset is incompatible with first", async (t) => {
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
test("only one pass through the ordering function is made when first is present", async (t) => {
  const result = await t.context.store.get({
    type: "bears",
    props: ["name"],
    order: [{ property: "name", direction: "asc", function: "memorySort" }],
    first: true,
  });

  t.deepEqual(result, { id: "2", name: "Cheer Bear" });
  t.deepEqual(t.context.sortCalls.length, 3);
});

test("only one pass through the ordering function is made when first is present (descending)", async (t) => {
  const result = await t.context.store.get({
    type: "bears",
    props: ["name"],
    order: [{ property: "name", direction: "desc", function: "memorySort" }],
    first: true,
  });

  t.deepEqual(result, { id: "3", name: "Wish Bear" });
  t.deepEqual(t.context.sortCalls.length, 3);
});
