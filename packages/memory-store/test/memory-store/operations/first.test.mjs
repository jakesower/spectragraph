import test from "ava";
import { ERRORS, BlossomError } from "@blossom-js/core/errors";
import { schema } from "../../fixtures/care-bear-schema.mjs";
import { MemoryStore } from "../../../src/memory-store.mjs";
import { careBearData } from "../../fixtures/care-bear-data.mjs";

test.beforeEach((t) => {
  // eslint-disable-next-line no-param-reassign
  t.context = { store: MemoryStore(schema).seed(careBearData) };
});

test("gets the first result from a collection", async (t) => {
  const result = await t.context.store.get({ type: "bears", first: true });

  t.deepEqual(result, { id: "1" });
});

test("throws an error when trying to get the first on a singular resource", async (t) => {
  await t.throwsAsync(
    async () => {
      const bad = await t.context.store.get({ type: "bears", id: "1", first: true });
      console.log(bad);
    },
    { instanceOf: BlossomError, message: ERRORS.FIRST_NOT_ALLOWED_ON_SINGULAR },
  );
});
