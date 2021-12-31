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

// Actual Tests

test.only("fails validation for invalid types", async (t) => {
  const result = await t.context.store.get({ type: "bearz", id: "1" });

  t.like(result, { isValid: false });
});
