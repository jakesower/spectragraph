import anyTest, { TestInterface } from "ava";
import { schema } from "../fixtures/care-bear-schema";
import { makeMemoryStore } from "../../src/memory-store";
import { careBearData } from "../fixtures/care-bear-data";

const normalizedData = careBearData;

const test = anyTest;
test.beforeEach(async (t) => {
  // eslint-disable-next-line no-param-reassign
  t.context = { store: await makeMemoryStore(schema, { initialData: normalizedData }) };
});

/*
 * singular queries
*/

test("id mismatches between query and data fails", async (t) => {
  const err = await t.throwsAsync(async () => {
    await t.context.store.replaceOne(
      { type: "bears", id: "5" },
      { type: "bears", id: "mismatched", fur_color: "brink pink" },
    );
  });

  t.deepEqual(err.code, "PG-0002");
});

test("it fails when presenting an array to a query with an id", async (t) => {
  const err = await t.throwsAsync(async () => {
    await t.context.store.replaceOne(
      { type: "bears", id: "5" },
      [{ type: "bears", id: "5", fur_color: "brink pink" }],
    );
  });

  t.deepEqual(err.code, "PG-0002");
});

test("it fails when using an empty id", async (t) => {
  const err = await t.throwsAsync(async () => {
    await t.context.store.replaceOne(
      { type: "bears", id: "" },
      { type: "bears", id: "", fur_color: "brink pink" },
    );
  });

  t.deepEqual(err.code, "PG-0002");
});

/*
 * plural queries
*/

test("it fails when presenting an object to a plural query", async (t) => {
  const err = await t.throwsAsync(async () => {
    await t.context.store.replaceOne(
      { type: "bears" },
      { type: "bears", id: "5", fur_color: "brink pink" },
    );
  });

  t.deepEqual(err.code, "PG-0002");
});

/*
 * resource validation
*/

test("it fails when presenting the wrong type for a string field", async (t) => {
  const err = await t.throwsAsync(async () => {
    await t.context.store.replaceOne(
      { type: "bears", id: "5" },
      { type: "bears", id: "5", fur_color: false },
    );
  });

  t.deepEqual(err.code, "PG-0002");
});

test("it fails when presenting the wrong type for a number field", async (t) => {
  const err = await t.throwsAsync(async () => {
    await t.context.store.replaceOne(
      { type: "bears", id: "5" },
      { type: "bears", id: "5", year_introduced: "2021" },
    );
  });

  t.deepEqual(err.code, "PG-0002");
});

test("it fails when presenting the wrong type for a boolean field", async (t) => {
  const err = await t.throwsAsync(async () => {
    await t.context.store.replaceOne(
      { type: "homes", id: "5" },
      { type: "homes", id: "5", is_in_clouds: "nope" },
    );
  });

  t.deepEqual(err.code, "PG-0002");
});
