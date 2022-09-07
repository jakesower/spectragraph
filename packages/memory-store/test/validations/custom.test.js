import test from "ava";
import { makeMemoryStore } from "../../src/memory-store/memory-store.js";
import { careBearData } from "../fixtures/care-bear-data.js";
import { schema } from "../fixtures/care-bear-schema.js";

const noSelfAsBestFriendStr = "a bear can't be best friends with themselves!";

const validations = [
  {
    name: "no self as best friend",
    resourceType: "bears",
    validateResource: (updatedResource) => {
      if (updatedResource.best_friend?.id === updatedResource.id) {
        throw new Error(noSelfAsBestFriendStr);
      }
    },
  },
  {
    validate: (updatedTree) => {
      if (!updatedTree.powers.some((power) => power.name === "Care Bear Stare")) {
        return [{
          validationName: "original bears have Care Bear Stare",
          message: "original bears must have Care Bear Stare",
          type: "bears",
          id: "string",
          validationType: "resource",
        }];
      }
      return [];
    },
  },
];

test.beforeEach(async (t) => {
  // eslint-disable-next-line no-param-reassign
  t.context = {
    store: await makeMemoryStore(schema, {
      initialData: careBearData,
      validations,
    }),
  };
});

test("enforces no custom validaton (single resource - no self as best_friend)", async (t) => {
  const err = await t.throwsAsync(async () => {
    await t.context.store.replaceOne(
      {
        type: "bears",
        id: "2",
        relationships: { best_friend: {} },
      },
      { type: "bears", id: "2", best_friend: { id: "2" } },
    );
  });

  t.deepEqual(err.message, noSelfAsBestFriendStr);
});
