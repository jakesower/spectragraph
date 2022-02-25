import test from "ava";
import { schema } from "../fixtures/care-bear-schema.mjs";
import { careBearData, grumpyBear } from "../fixtures/care-bear-data.mjs";
import { makeMemoryStore } from "../../src/memory-store/memory-store.mjs";

const makeStore = async (overrides = {}, dataOverrides = {}) => {
  const store = await makeMemoryStore(schema, {
    initialData: { ...careBearData, ...dataOverrides },
    ...overrides,
  });
  // console.log("\n\n\nmade store\n\n\n");
  return store;
};

const errorMessage = (validationName, message) => (
  `validation "${validationName}" failed: ${message}`
);

function resultData(result) {
  return result.isValid
    ? result.data
    : result;
}

const tenderheart = careBearData.bears["1"];

// ----General-------------------------------------------------------------------------------------

// TODO: move these next several tests elsewhere
test("doesn't require initial data", async (t) => {
  await t.notThrowsAsync(async () => {
    await makeMemoryStore(schema);
  });
});

test("allows partial initial data", async (t) => {
  await t.notThrowsAsync(async () => {
    await makeStore({
      initialData: {
        bears: {
          1: { ...tenderheart, home: null, powers: [] },
        },
      },
    });
  });
});

test("doesn't allow bad initial data", async (t) => {
  const error = await t.throwsAsync(async () => {
    await makeStore({
      initialData: {
        bears: {
          1: {
            ...tenderheart,
            name: 500,
          },
        },
      },
    });
  });

  t.deepEqual(
    error.message,
    "a property did not meet the validation criteria",
  );
});

// ----Consistency-Level---------------------------------------------------------------------------

test("does allow relationship reassignment from branch nodes on query", async (t) => {
  const store = await makeStore();
  const updateTree = {
    id: "1",
    home: {
      id: "1",
      bears: [careBearData.bears["1"], careBearData.bears["2"]],
    },
  };

  const replaceResult = await store.replaceOne(
    { type: "bears", id: "1", relationships: { home: { relationships: { bears: {} } } } },
    updateTree,
  );

  t.like(resultData(replaceResult), {
    bears: {
      1: {
        home: { type: "homes", id: "1" },
      },
      3: {
        home: null,
      },
    },
    homes: {
      1: {
        bears: [{ type: "bears", id: "1" }, { type: "bears", id: "2" }],
      },
    },
  });
});

test("does not allow resource reassignment from leaf nodes on query", async (t) => {
  const store = await makeStore();
  const updateTree = {
    id: "1",
    home: {
      id: "1",
      bears: [careBearData.bears["1"], careBearData.bears["2"]],
    },
  };

  const replaceResult = await store.replaceOne(
    { type: "bears", id: "1", relationships: { home: {} } },
    updateTree,
  );

  t.like(resultData(replaceResult), {
    homes: {
      1: {
        bears: careBearData.homes["1"].bears,
      },
    },
  });
});

// TODO: throw an error in strict mode
test("does not allow resource creation from leaf nodes on query", async (t) => {
  const store = await makeStore();
  const updateTree = {
    id: "1",
    home: {
      id: "1",
      bears: [careBearData.bears["1"], grumpyBear],
    },
  };

  const replaceResult = await store.replaceOne(
    { type: "bears", id: "1", relationships: { home: {} } },
    updateTree,
  );

  t.like(resultData(replaceResult), {
    homes: {
      1: {
        bears: careBearData.homes["1"].bears,
      },
    },
  });
});

// ----Graph-Level---------------------------------------------------------------------------------

test("does not allow relationships to nonexistant resources", async (t) => {
  const error = await t.throwsAsync(async () => {
    await makeStore({
      initialData: {
        bears: {
          1: { ...tenderheart, home: { type: "homes", id: "oopsie!" } },
        },
      },
    });
  });

  t.deepEqual(error.message, "resource references must already be present in the store to be used");
  t.deepEqual(error.details, {
    ref: { type: "homes", id: "oopsie!" },
    referencingResources: [{ ...tenderheart, home: { type: "homes", id: "oopsie!" } }],
  });
});
