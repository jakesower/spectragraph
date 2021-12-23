import test from "ava";
import { schema } from "../fixtures/care-bear-schema";
import { careBearData } from "../fixtures/care-bear-data";
import { makeMemoryStore } from "../../src/memory-store";
import { formatRef } from "../../src/utils";

const makeStore = async (overrides = {}, dataOverrides = {}) => {
  const store = await makeMemoryStore(schema, {
    initialData: { ...careBearData, ...dataOverrides },
    ...overrides,
  });
  console.log("\n\n\nmade store\n\n\n");
  return store;
};

const errorMessage = (validationName, message) => (
  `validation "${validationName}" failed: ${message}`
);

const resErrorMessage = (validationName, propName, actualValue) => (
  errorMessage(validationName, `"${actualValue}" is not a valid value for "${propName}"`)
);

function resultData(result) {
  return result.isValid
    ? result.data
    : result;
}

const tenderheart = careBearData.bears["1"];
const careALot = careBearData.homes["1"];

// ----General-------------------------------------------------------------------------------------

// TODO: move these next several tests elsewhere
test("allows no initial data", async (t) => {
  await t.notThrowsAsync(async () => {
    await makeMemoryStore(schema);
  });
});

test("allows partial initial data", async (t) => {
  await t.notThrowsAsync(async () => {
    await makeStore({
      initialData: {
        bears: {
          1: { ...tenderheart, relationships: {} },
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
            properties: { ...tenderheart.properties, name: 500 },
            relationships: {},
          },
        },
      },
    });
  });

  t.deepEqual(
    error.message,
    'Invalid initial data.\n\nvalidation "propertyTypes" failed: "500" is not a valid value for "name" (bears, 1)',
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
        relationships: { home: { type: "homes", id: "1" } },
      },
      3: {
        relationships: { home: null },
      },
    },
    homes: {
      1: {
        relationships: { bears: [{ type: "bears", id: "1" }, { type: "bears", id: "2" }] },
      },
    },
  });
});

test.todo("does not allow resource creation from leaf nodes on query");
test.todo("strings and numbers are clearly differentiated in error messages");

// ----Resource-Level------------------------------------------------------------------------------

test("enforces types on values", async (t) => {
  const store = await makeStore();
  const replaceResult = await store.replaceOne(
    { type: "bears", id: "1", relationships: { home: {} } },
    {
      ...tenderheart,
      name: false,
      home: {
        ...careALot,
        caring_meter: "really big!",
        is_in_clouds: "yep",
      },
    },
  );

  t.deepEqual(replaceResult, {
    errors: [
      {
        validationName: "propertyTypes",
        validationType: "resource",
        message: '"false" is not a valid value for "name"',
        type: "bears",
        id: "1",
      },
      {
        validationName: "propertyTypes",
        validationType: "resource",
        message: '"really big!" is not a valid value for "caring_meter"',
        type: "homes",
        id: "1",
      },
      {
        validationName: "propertyTypes",
        validationType: "resource",
        message: '"yep" is not a valid value for "is_in_clouds"',
        type: "homes",
        id: "1",
      },
    ],
    isValid: false,
  });
});

// ----Graph-Level---------------------------------------------------------------------------------

test.skip("does not allow relationships to nonexistant resources", async (t) => {
  const error = await t.throwsAsync(async () => {
    await makeStore({
      initialData: {
        bears: {
          1: { ...tenderheart, relationships: { home: { type: "homes", id: "oopsie!" } } },
        },
      },
    });
  });

  // const expectedErrors = [
  //   resErrorMessage("propertyTypes", "name", undefined),
  //   resErrorMessage("propertyTypes", "location", undefined),
  //   resErrorMessage("propertyTypes", "caring_meter", undefined),
  //   resErrorMessage("propertyTypes", "is_in_clouds", undefined),
  // ];
  const expectedErrors = [
    errorMessage("validateRelationshipsExist", `${formatRef({ type: "homes", id: "oopsie!" })} doesn't exist`),
  ];

  t.deepEqual(error.message, `Invalid initial data.\n\n${expectedErrors.join("\n")}`);

  console.log(error);
});
