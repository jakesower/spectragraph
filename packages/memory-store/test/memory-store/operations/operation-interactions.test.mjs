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
