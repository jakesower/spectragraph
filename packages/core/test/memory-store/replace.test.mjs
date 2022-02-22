import test from "ava";
import { forEachObj, mapObj } from "@polygraph/utils";
import { schema } from "../fixtures/care-bear-schema.mjs";
import { makeMemoryStore } from "../../src/memory-store/memory-store.mjs";
import { careBearData, grumpyBear } from "../fixtures/care-bear-data.mjs";
import { ERRORS } from "../../src/strings.mjs";
import { PolygraphError } from "../../src/validations/errors.mjs";

test.beforeEach(async (t) => {
  // eslint-disable-next-line no-param-reassign
  t.context = { store: await makeMemoryStore(schema, { initialData: careBearData }) };
  // console.log("\n\n\nmade store\n\n\n");
});

const emptyStore = mapObj(schema.resources, () => ({}));

function makeSubGraph(subGraph) {
  const out = mapObj(schema.resources, () => ({}));
  forEachObj(subGraph, (subRess, resType) => { out[resType] = subRess; });
  return out;
}

const toRef = (type) => (id) => ({ type, id });

// ----Properties----------------------------------------------------------------------------------

test("uses defaults when creating a resource missing the property", async (t) => {
  const createResult = await t.context.store.replaceOne(
    { type: "companions", id: "nobody", allProperties: true },
    { type: "companions", id: "nobody", name: "Friend" },
  );
  const createExpected = {
    companions: {
      nobody: {
        name: "Friend",
        recurs: false,
      },
    },
  };

  t.like(createResult, createExpected);
});

test("does not use defaults when creating a resource has the property", async (t) => {
  const createResult = await t.context.store.replaceOne(
    { type: "companions", id: "nobody", allProperties: true },
    {
      type: "companions", id: "nobody", name: "Friend", recurs: true,
    },
  );
  const createExpected = {
    companions: {
      nobody: {
        name: "Friend",
        recurs: true,
      },
    },
  };

  t.like(createResult, createExpected);
});

test("does not fail when creating a resource without an optional property", async (t) => {
  const createResult = await t.context.store.replaceOne(
    { type: "companions", id: "nobody" },
    { id: "nobody" },
  );
  const createExpected = {
    companions: {
      nobody: {
        name: undefined,
        recurs: false,
      },
    },
  };

  t.like(createResult, createExpected);
});

// might replace the next one--the goal is to check that the query itself can't be used to create a resource
test.todo("fails to create a resource that doesn't have a required field in the query");

test("fails to create a resource that doesn't have a required field in the tree", async (t) => {
  await t.throwsAsync(async () => {
    const replaceResult = await t.context.store.replaceOne(
      { type: "bears", id: "4" },
      grumpyBear,
    );
    console.log(replaceResult);
  }, { instanceOf: PolygraphError, message: ERRORS.QUERY_MISSING_CREATE_FIELDS });
});

test("replaces a property when part of the query", async (t) => {
  const replaceResult = await t.context.store.replaceOne(
    { type: "bears", id: "5", properties: ["fur_color"] },
    { id: "5", fur_color: "brink pink" },
  );
  const replaceExpected = {
    ...emptyStore,
    bears: {
      5: {
        ...careBearData.bears[5],
        fur_color: "brink pink",
      },
    },
  };

  t.deepEqual(replaceResult, replaceExpected);
});

test("replaces a property if allProperties is specified", async (t) => {
  const replaceResult = await t.context.store.replaceOne(
    { type: "bears", id: "5", allProperties: true },
    { id: "5", fur_color: "brink pink" },
  );
  const replaceExpected = {
    ...emptyStore,
    bears: {
      5: {
        ...careBearData.bears[5],
        fur_color: "brink pink",
      },
    },
  };

  t.deepEqual(replaceResult, replaceExpected);
});

test("does not replace a property if the property is not specified", async (t) => {
  const replaceResult = await t.context.store.replaceOne(
    { type: "bears", id: "5" },
    { id: "5", fur_color: "brink pink" },
  );
  const replaceExpected = { ...emptyStore, bears: { 5: careBearData.bears[5] } };

  t.deepEqual(replaceResult, replaceExpected);
});

test("keeps values with default when replacing other properties", async (t) => {
  await t.context.store.replaceOne(
    { type: "companions", id: "nobody", allProperties: true },
    {
      type: "companions", id: "nobody", name: "Alice", recurs: true,
    },
  );
  const replaceResult = await t.context.store.replaceOne(
    { type: "companions", id: "nobody", allProperties: true },
    { type: "companions", id: "nobody", name: "Bob" },
  );
  const replaceExpected = {
    companions: {
      nobody: {
        name: "Bob",
        recurs: true,
      },
    },
  };

  t.like(replaceResult, replaceExpected);
});

test("replaces a property deep in the graph", async (t) => {
  const replaceResult = await t.context.store.replaceOne(
    { type: "bears", id: "1", subQueries: { home: { allProperties: true } } },
    { type: "bears", id: "1", home: { id: "1", caring_meter: 0.4 } },
  );

  const replaceExpected = {
    ...emptyStore,
    bears: { 1: careBearData.bears[1] },
    homes: { 1: { ...careBearData.homes[1], caring_meter: 0.4 } },
  };

  t.deepEqual(replaceResult, replaceExpected);
});

test("resources can have properties named type that can be updated", async (t) => {
  const replaceResult = await t.context.store.replaceOne(
    { type: "powers", id: "careBearStare", properties: ["type"] },
    { id: "careBearStare", type: "bear power" },
  );

  const replaceExpected = {
    ...emptyStore,
    powers: { careBearStare: { ...careBearData.powers.careBearStare, type: "bear power" } },
  };

  t.deepEqual(replaceResult, replaceExpected);

  const getResult = await t.context.store.get({
    type: "powers",
    id: "careBearStare",
  });

  const expectedRes = { id: "careBearStare" };
  t.deepEqual(getResult, expectedRes);
});

// ----Replacement---------------------------------------------------------------------------------

test("replaces existing data completely given a new resource", async (t) => {
  const query = {
    type: "bears",
    allProperties: true,
    subQueries: {
      home: {},
      powers: {},
    },
  };

  const replaceResult = await t.context.store.replaceMany(query, [grumpyBear]);
  const replaceExpected = {
    ...emptyStore,
    bears: {
      1: null,
      2: null,
      3: null,
      4: grumpyBear,
      5: null,
    },
    homes: {
      1: { ...careBearData.homes[1], bears: [{ type: "bears", id: "4" }] },
    },
    powers: {
      careBearStare: { ...careBearData.powers.careBearStare, bears: [{ type: "bears", id: "4" }] },
    },
  };

  t.deepEqual(replaceResult, replaceExpected);

  const getResult = await t.context.store.get({
    type: "bears",
  });

  t.deepEqual(getResult, [{ id: "4" }]);
});

test("replaces or keeps existing data given a new resources", async (t) => {
  const query = {
    type: "bears",
    allProperties: true,
    subQueries: {
      home: {},
      powers: {},
    },
  };

  const replaceResult = await t.context.store.replaceMany(
    query,
    [grumpyBear, careBearData.bears["1"]],
  );
  const replaceExpected = {
    ...emptyStore,
    bears: {
      1: careBearData.bears["1"],
      2: null,
      3: null,
      4: grumpyBear,
      5: null,
    },
    homes: {
      1: { ...careBearData.homes[1], bears: ["1", "4"].map(toRef("bears")) },
    },
    powers: {
      careBearStare: { ...careBearData.powers.careBearStare, bears: ["1", "4"].map(toRef("bears")) },
    },
  };

  t.deepEqual(replaceResult, replaceExpected);

  const getResult = await t.context.store.get({
    type: "bears",
  });
  t.deepEqual(getResult, [{ id: "1" }, { id: "4" }]);
});

// ----Relationships-------------------------------------------------------------------------------

test("replaces a one-to-one relationship", async (t) => {
  const replaceResult = await t.context.store.replaceOne(
    {
      type: "bears",
      id: "2",
      subQueries: { home: {} },
    },
    { id: "2", home: { type: "homes", id: "2" } },
  );

  const replaceExpected = {
    ...emptyStore,
    bears: {
      2: { ...careBearData.bears[2], home: { type: "homes", id: "2" } },
    },
    homes: {
      1: { ...careBearData.homes[1], bears: ["1", "3"].map(toRef("bears")) },
      2: { ...careBearData.homes[2], bears: ["2"].map(toRef("bears")) },
    },
  };
  t.deepEqual(replaceResult, replaceExpected);

  const bearResult = await t.context.store.get({
    type: "bears",
    id: "2",
    properties: ["belly_badge"],
    subQueries: { home: { properties: ["name"] } },
  });

  t.is(bearResult.home.name, "Forest of Feelings");

  const careALotResult = await t.context.store.get({
    type: "homes",
    id: "1",
    subQueries: { bears: {} },
  });

  t.is(careALotResult.bears.length, 2);
});

test("replaces a one-to-many-relationship", async (t) => {
  await t.context.store.replaceOne(
    { type: "homes", id: "1", subQueries: { bears: {} } },
    {
      type: "homes",
      id: "1",
      bears: [{ type: "bears", id: "1" }, { type: "bears", id: "5" }],
    },
  );

  const bearResult = await t.context.store.get({
    type: "bears",
    id: "2",
    subQueries: { home: {} },
  });

  t.is(bearResult.home, null);

  const smartHeartResult = await t.context.store.get({
    type: "bears",
    id: "5",
    subQueries: { home: { properties: ["name"] } },
  });

  t.is(smartHeartResult.home.name, "Care-a-Lot");

  const careALotResult = await t.context.store.get({
    type: "homes",
    id: "1",
    subQueries: { bears: {} },
  });

  t.is(careALotResult.bears.length, 2);
});

test("creates a relationship and replaces a property deep in the graph", async (t) => {
  const replaceResult = await t.context.store.replaceOne(
    { type: "bears", id: "5", subQueries: { home: { properties: ["caring_meter"] } } },
    { type: "bears", id: "5", home: { id: "1", caring_meter: 0.3 } },
  );

  const replaceExpected = {
    ...emptyStore,
    bears: { 5: { ...careBearData.bears[5], home: { type: "homes", id: "1" } } },
    homes: {
      1: {
        ...careBearData.homes[1],
        bears: ["1", "2", "3", "5"].map(toRef("bears")),
        caring_meter: 0.3,
      },
    },
  };

  t.deepEqual(replaceResult, replaceExpected);
});
