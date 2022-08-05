import test from "ava";
import Database from "better-sqlite3";
import { omit } from "@blossom/utils/objects";
import { ERRORS, blossomError } from "@blossom/core/errors";
import { careBearSchema as schema } from "../fixtures/care-bear-schema.mjs";
import { SQLiteStore } from "../../src/sqlite-store.mjs";
import { careBearData, grumpyBear } from "../fixtures/care-bear-data.mjs";
import { createTables, seed } from "../../src/actions/seed.mjs";

// Test Setup
test.beforeEach(async (t) => {
  const db = Database(":memory:");
  createTables(schema, db);
  seed(schema, db, careBearData);

  const store = await SQLiteStore(schema, db);

  // eslint-disable-next-line no-param-reassign
  t.context = { store };
});

const withRels = (resType, res, relsToKeep) => {
  const keepSet = new Set(relsToKeep);
  return omit(
    res,
    Object.keys(schema.resources[resType].properties).filter(
      (prop) =>
        schema.resources[resType].properties[prop].type === "relationship" &&
        !keepSet.has(prop),
    ),
  );
};

const withoutRels = (resType, res) =>
  omit(
    res,
    Object.keys(schema.resources[resType].properties).filter(
      (prop) => schema.resources[resType].properties[prop].type === "relationship",
    ),
  );

// ----Properties----------------------------------------------------------------------------------

test("creates a completely defined resource with no relationships", async (t) => {
  await t.context.store.set({ type: "bears", id: "4", allProps: true }, grumpyBear);

  const getResult = await t.context.store.get({
    type: "bears",
    id: "4",
    allProps: true,
  });
  const getExpected = withoutRels("bears", grumpyBear);

  t.deepEqual(getResult, getExpected);
});

test("resources can have properties named type that can be updated", async (t) => {
  const query = {
    type: "powers",
    id: "careBearStare",
    properties: ["type"],
  };

  await t.context.store.set(query, { id: "careBearStare", type: "bear power" });

  const getResult = await t.context.store.get(query);
  const getExpected = { id: "careBearStare", type: "bear power" };

  t.deepEqual(getResult, getExpected);
});

test("uses defaults when creating a resource missing the property", async (t) => {
  const nobody = {
    id: "nobody",
    name: "Friend",
  };

  await t.context.store.set({ type: "companions", id: "nobody", allProps: true }, nobody);

  const getResult = await t.context.store.get({
    type: "companions",
    id: "nobody",
    allProps: true,
  });
  const getExpected = withoutRels("companions", { ...nobody, recurs: false });

  t.deepEqual(getResult, getExpected);
});

test("does not use defaults when creating a resource that specifies the property", async (t) => {
  const nobody = {
    id: "nobody",
    name: "Friend",
    recurs: true,
  };

  await t.context.store.set({ type: "companions", id: "nobody", allProps: true }, nobody);

  const getResult = await t.context.store.get({
    type: "companions",
    id: "nobody",
    allProps: true,
  });
  const getExpected = withoutRels("companions", nobody);

  t.deepEqual(getResult, getExpected);
});

test("does not fail when creating a resource without an optional property", async (t) => {
  const nobody = { id: "nobody" };
  const implicitNobody = {
    ...nobody,
    name: undefined,
    recurs: false,
  };

  await t.context.store.set({ type: "companions", id: "nobody" }, nobody);

  const getResult = await t.context.store.get({
    type: "companions",
    id: "nobody",
    allProps: true,
  });
  const getExpected = withoutRels("companions", implicitNobody);

  t.deepEqual(getResult, getExpected);
});

test("does not allow refs to be updated", async (t) => {
  await t.throwsAsync(
    async () => {
      const replaceResult = await t.context.store.set(
        { type: "bears", id: "4", props: ["home"] },
        grumpyBear,
      );
      console.log(replaceResult);
    },
    { instanceOf: blossomError, message: ERRORS.INVALID_SET_QUERY_SYNTAX },
  );
});

test("fails to create a resource that doesn't have a required field in the tree", async (t) => {
  await t.throwsAsync(
    async () => {
      await t.context.store.set(
        { type: "bears", id: "4" },
        grumpyBear,
      );
    },
    { instanceOf: blossomError, message: ERRORS.QUERY_MISSING_CREATE_FIELDS },
  );
});

test("replaces a property when part of the query", async (t) => {
  const query = { type: "bears", id: "5", properties: ["fur_color"] };
  await t.context.store.set(query, {
    id: "5",
    fur_color: "brink pink",
  });

  const getResult = await t.context.store.get(query);
  const getExpected = { id: "5", fur_color: "brink pink" };

  t.deepEqual(getResult, getExpected);
});

test("replaces a property if allProps is specified", async (t) => {
  const query = { type: "bears", id: "5", allProps: true };
  await t.context.store.set(query, {
    id: "5",
    fur_color: "brink pink",
  });

  const getResult = await t.context.store.get(query);
  const getExpected = withRels(
    "bears",
    { ...careBearData.bears[5], fur_color: "brink pink" },
    [],
  );

  t.deepEqual(getResult, getExpected);
});

test("does not replace a property if the property is not specified", async (t) => {
  const query = { type: "bears", id: "5" };
  await t.context.store.set(query, {
    id: "5",
    fur_color: "brink pink",
  });

  const getResult = await t.context.store.get({ ...query, allProps: true });
  const getExpected = withRels("bears", careBearData.bears[5], []);

  t.deepEqual(getResult, getExpected);
});

test("keeps values with default when replacing other properties", async (t) => {
  await t.context.store.set(
    { type: "companions", id: "nobody", allProps: true },
    {
      type: "companions",
      id: "nobody",
      name: "Alice",
      recurs: true,
    },
  );

  await t.context.store.set(
    { type: "companions", id: "nobody", allProps: true },
    { type: "companions", id: "nobody", name: "Bob" },
  );

  const getResult = await t.context.store.get({
    type: "companions",
    id: "nobody",
    allProps: true,
  });

  const getExpected = withRels(
    "companions",
    { id: "nobody", name: "Bob", recurs: true },
    [],
  );

  t.deepEqual(getResult, getExpected);
});

test("replaces a property deep in the graph", async (t) => {
  const query = { type: "bears", id: "1", relationships: { home: { allProps: true } } };

  await t.context.store.set(query, {
    id: "1",
    home: { id: "1", caring_meter: 0.4 },
  });

  const getResult = await t.context.store.get(query);
  const getExpected = {
    id: "1",
    home: {
      ...withRels("homes", careBearData.homes[1], []),
      caring_meter: 0.4,
    },
  };

  t.deepEqual(getResult, getExpected);
});

// ----Relationships-------------------------------------------------------------------------------

test("replaces a to-one relationship", async (t) => {
  const query = {
    type: "bears",
    id: "3",
    relationships: { home: {} },
  };

  await t.context.store.set(query, { id: "3", home: { id: "2" } });

  const directCheck = {
    actual: await t.context.store.get(query),
    expected: { id: "3", home: { id: "2" } },
  };
  t.deepEqual(directCheck.actual, directCheck.expected);

  const linkedRelCheck = {
    actual: await t.context.store.get({
      type: "homes",
      id: "2",
      relationships: { bears: {} },
    }),
    expected: { id: "2", bears: [{ id: "3" }] },
  };
  t.deepEqual(linkedRelCheck.actual, linkedRelCheck.expected);

  const unlinkedRelCheck = {
    actual: await t.context.store.get({
      type: "homes",
      id: "1",
      relationships: { bears: {} },
    }),
    expected: { id: "1", bears: [{ id: "1" }, { id: "2" }] },
  };
  t.deepEqual(unlinkedRelCheck.actual, unlinkedRelCheck.expected);
});

test("adds a one-to-many-relationship", async (t) => {
  const query = { type: "homes", id: "1", relationships: { bears: {} } };

  await t.context.store.set(query, {
    type: "homes",
    id: "1",
    bears: [
      { type: "bears", id: "1" },
      { type: "bears", id: "2" },
      { type: "bears", id: "3" },
      { type: "bears", id: "5" },
    ],
  });

  const bearResult = await t.context.store.get({
    type: "bears",
    id: "2",
    relationships: { home: { properties: ["name"] } },
  });
  t.is(bearResult.home.name, "Care-a-Lot");

  const smartHeartResult = await t.context.store.get({
    type: "bears",
    id: "5",
    relationships: { home: { properties: ["name"] } },
  });
  t.is(smartHeartResult.home.name, "Care-a-Lot");

  const careALotResult = await t.context.store.get({
    type: "homes",
    id: "1",
    relationships: { bears: {} },
  });
  t.deepEqual(careALotResult, {
    id: "1",
    bears: [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "5" }],
  });
});

test("removes a one-to-many-relationship", async (t) => {
  const query = { type: "homes", id: "1", relationships: { bears: {} } };

  await t.context.store.set(query, {
    type: "homes",
    id: "1",
    bears: [
      { type: "bears", id: "1" },
      { type: "bears", id: "2" },
    ],
  });

  const bearResult = await t.context.store.get({
    type: "bears",
    id: "2",
    relationships: { home: { properties: ["name"] } },
  });
  t.is(bearResult.home.name, "Care-a-Lot");

  const wishBearResult = await t.context.store.get({
    type: "bears",
    id: "5",
    relationships: { home: { properties: ["name"] } },
  });
  t.is(wishBearResult.home, null);

  const careALotResult = await t.context.store.get({
    type: "homes",
    id: "1",
    relationships: { bears: {} },
  });
  t.deepEqual(careALotResult, {
    id: "1",
    bears: [{ id: "1" }, { id: "2" }],
  });
});

test("adds and replaces resources in a one-to-many-relationship", async (t) => {
  const query = { type: "homes", id: "1", relationships: { bears: {} } };

  await t.context.store.set(query, {
    type: "homes",
    id: "1",
    bears: [
      { type: "bears", id: "1" },
      { type: "bears", id: "5" },
    ],
  });

  const bearResult = await t.context.store.get({
    type: "bears",
    id: "2",
    relationships: { home: {} },
  });

  t.is(bearResult.home, null);

  const smartHeartResult = await t.context.store.get({
    type: "bears",
    id: "5",
    relationships: { home: { properties: ["name"] } },
  });

  t.is(smartHeartResult.home.name, "Care-a-Lot");

  const careALotResult = await t.context.store.get({
    type: "homes",
    id: "1",
    relationships: { bears: {} },
  });

  t.is(careALotResult.bears.length, 2);
});

test("adds a many-to-many relationship", async (t) => {
  const query = { type: "bears", id: "1", relationships: { powers: {} } };
  const update = { id: "1", powers: [{ id: "careBearStare" }, { id: "makeWish" }] };

  await t.context.store.set(query, update);

  t.deepEqual(await t.context.store.get(query), update);

  const powerResult = await t.context.store.get({
    type: "powers",
    id: "makeWish",
    relationships: { bears: { properties: ["name"] } },
  });
  t.deepEqual(powerResult, {
    id: "makeWish",
    bears: [{ id: "1", name: "Tenderheart Bear" }],
  });
});

test("removes a many-to-many relationship", async (t) => {
  const query = { type: "bears", id: "1", relationships: { powers: {} } };
  const update = { id: "1", powers: [] };

  await t.context.store.set(query, update);

  t.deepEqual(await t.context.store.get(query), update);

  const powerResult = await t.context.store.get({
    type: "powers",
    id: "careBearStare",
    relationships: { bears: {} },
  });
  t.deepEqual(powerResult, {
    id: "careBearStare",
    bears: [{ id: "2" }, { id: "3" }, { id: "5" }],
  });
});

test("adds and removes a many-to-many relationship", async (t) => {
  const query = { type: "bears", id: "1", relationships: { powers: {} } };
  const update = { id: "1", powers: [{ id: "makeWish" }] };

  await t.context.store.set(query, update);

  t.deepEqual(await t.context.store.get(query), update);

  const powerResultAdd = await t.context.store.get({
    type: "powers",
    id: "makeWish",
    relationships: { bears: { properties: ["name"] } },
  });
  t.deepEqual(powerResultAdd, {
    id: "makeWish",
    bears: [{ id: "1", name: "Tenderheart Bear" }],
  });

  const powerResultRem = await t.context.store.get({
    type: "powers",
    id: "careBearStare",
    relationships: { bears: {} },
  });
  t.deepEqual(powerResultRem, {
    id: "careBearStare",
    bears: [{ id: "2" }, { id: "3" }, { id: "5" }],
  });
});

test.todo("adds and removes a symmetric many-to-many relationship");

// ----Deleting Resources--------------------------------------------------------------------------

test("replaces existing data completely given a new resource", async (t) => {
  const query = {
    type: "bears",
    allProps: true,
    relationships: {
      home: {},
      powers: {},
    },
  };

  await t.context.store.set(query, [grumpyBear]);

  const getResultBase = await t.context.store.get(query);
  const getExpectedBase = [
    {
      ...withRels("bears", grumpyBear, []),
      home: { id: "1" },
      powers: [{ id: "careBearStare" }],
    },
  ];
  t.deepEqual(getResultBase, getExpectedBase);

  const getResultOneRel = await t.context.store.get({
    type: "homes",
    id: "1",
    relationships: { bears: {} },
  });
  const getExpectedOneRel = {
    id: "1",
    bears: [{ id: "4" }],
  };
  t.deepEqual(getResultOneRel, getExpectedOneRel);

  const getResultManyRel = await t.context.store.get({
    type: "powers",
    id: "careBearStare",
    relationships: { bears: {} },
  });
  const getExpectedManyRel = {
    id: "careBearStare",
    bears: [{ id: "4" }],
  };
  t.deepEqual(getResultManyRel, getExpectedManyRel);
});

test("replaces or keeps existing data given a new resources", async (t) => {
  const query = {
    type: "bears",
    allProps: true,
    relationships: {},
  };

  const update = [careBearData.bears["1"], grumpyBear];
  await t.context.store.set(query, update);

  t.deepEqual(await t.context.store.get({ type: "bears" }), [{ id: "1" }, { id: "4" }]);
});

// trees where a resource is specified more than once

test.todo("should handle default values properly on multi-specification");
