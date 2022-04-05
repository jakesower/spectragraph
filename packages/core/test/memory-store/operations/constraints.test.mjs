import test from "ava";
import { schema } from "../../fixtures/care-bear-schema.mjs";
import { makeMemoryStore } from "../../../src/memory-store/memory-store.mjs";
import { careBearData } from "../../fixtures/care-bear-data.mjs";

test.beforeEach(async (t) => {
  // eslint-disable-next-line no-param-reassign
  t.context = { store: await makeMemoryStore(schema, { initialData: careBearData }) };
});

test("filters on a property equality constraint", async (t) => {
  const result = await t.context.store.get({ type: "bears", constraints: { name: "Cheer Bear" } });

  t.deepEqual(result, [{ id: "2" }]);
});

test("filters on multiple property equality constraints", async (t) => {
  const result = await t.context.store.get(
    {
      type: "homes",
      constraints: {
        caring_meter: 1,
        is_in_clouds: false,
      },
    });

  t.deepEqual(result, [{ id: "2" }]);
});

test("filters using gt operator", async (t) => {
  const result = await t.context.store.get(
    {
      type: "bears",
      constraints: {
        year_introduced: { $gt: 2000 },
      },
    });

  t.deepEqual(result, [{ id: "5" }]);
});

test("filters related resources", async (t) => {
  const result = await t.context.store.get(
    {
      type: "powers",
      id: "careBearStare",
      relationships: {
        bears: {
          constraints: {
            year_introduced: { $gt: 2000 },
          },
        },
      },
    });

  t.deepEqual(result, { id: "careBearStare", bears: [{ id: "5" }] });
});
