import test from "ava";
import { schema } from "../../fixtures/care-bear-schema.mjs";
import { makeMemoryStore } from "../../../src/memory-store/memory-store.mjs";
import { careBearData } from "../../fixtures/care-bear-data.mjs";
import { ERRORS } from "../../../src/strings.mjs";
import { PolygraphError } from "../../../src/validations/errors.mjs";

test.beforeEach(async (t) => {
  // eslint-disable-next-line no-param-reassign
  t.context = { store: await makeMemoryStore(schema, { initialData: careBearData }) };
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
    { instanceOf: PolygraphError, message: ERRORS.FIRST_NOT_ALLOWED_ON_SINGULAR },
  );
});
