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

test("fails validation for invalid types", async (t) => {
  const err = await t.throwsAsync(async () => {
    await t.context.store.get({ type: "bearz", id: "1" });
  });

  t.deepEqual(err.code, "PG-0001");
});

test("fails validation for invalid top level props", async (t) => {
  const err = await t.throwsAsync(async () => {
    await t.context.store.get({ type: "bears", id: "1", koopa: "troopa" });
  });

  t.deepEqual(err.code, "PG-0001");
});

test("validates without an id", async (t) => {
  const result = await t.context.store.get({ type: "bears" });
  t.assert(Array.isArray(result));
});
