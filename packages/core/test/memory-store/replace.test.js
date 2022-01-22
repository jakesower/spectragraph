import anyTest from "ava";
import { mapObj, pick } from "@polygraph/utils";
import { schema } from "../fixtures/care-bear-schema";
import { makeMemoryStore } from "../../src/memory-store";
import { careBearData, grumpyBear } from "../fixtures/care-bear-data";

const dataTree = (res, rels = null) => {
  const { id, type, properties } = res;
  const resSchemaDef = schema.resources[type];

  const allRels = rels || Object.keys(resSchemaDef.relationships);
  return {
    id,
    ...properties,
    ...pick(res.relationships, allRels),
  };
};

const pickResources = (resInputs) => {
  const subGraph = {
    bears: {}, companions: {}, homes: {}, powers: {},
  };

  resInputs.forEach((input) => {
    if (!Array.isArray(input)) {
      subGraph[input.type][input.id] = input;
    } else {
      const [type, id, overrides = {}] = input;
      const relKeys = Object.keys(schema.resources[type].relationships);

      if (overrides === null) {
        subGraph[type][id] = null;
      } else {
        const base = careBearData[type][id] ?? {};
        const overrideRels = mapObj(
          pick(overrides || {}, relKeys),
          (relIds, relType) => {
            const resDef = schema.resources[type].relationships[relType];
            const toRef = (idOrRef) => ((typeof idOrRef === "string")
              ? { type: resDef.relatedType, id: idOrRef }
              : idOrRef);
            return Array.isArray(relIds)
              ? relIds.map(toRef)
              : toRef(relIds);
          },
        );

        subGraph[type][id] = {
          ...base,
          ...overrides,
          ...overrideRels,
        };
      }
    }
  });

  return subGraph;
};

const test = anyTest;

test.beforeEach(async (t) => {
  // eslint-disable-next-line no-param-reassign
  t.context = { store: await makeMemoryStore(schema, { initialData: careBearData }) };
  // console.log("\n\n\nmade store\n\n\n");
});

// ----Properties----------------------------------------------------------------------------------

test("uses defaults when creating a resource missing the property", async (t) => {
  const createResult = await t.context.store.replaceOne(
    { type: "companions", id: "nobody" },
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
    { type: "companions", id: "nobody" },
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

test("replaces a property", async (t) => {
  const replaceResult = await t.context.store.replaceOne(
    { type: "bears", id: "5" },
    { id: "5", fur_color: "brink pink" },
  );
  const replaceExpected = pickResources([
    ["bears", "5", { fur_color: "brink pink" }],
  ]);

  t.deepEqual(replaceResult, replaceExpected);
});

test("keeps values with default when replacing other properties", async (t) => {
  await t.context.store.replaceOne(
    { type: "companions", id: "nobody" },
    {
      type: "companions", id: "nobody", name: "Alice", recurs: true,
    },
  );
  const replaceResult = await t.context.store.replaceOne(
    { type: "companions", id: "nobody" },
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
    { type: "bears", id: "1", relationships: { home: {} } },
    { type: "bears", id: "1", home: { id: "1", caring_meter: 0.4 } },
  );

  const replaceExpected = pickResources([
    ["bears", "1"],
    ["homes", "1", { caring_meter: 0.4 }],
  ]);

  t.deepEqual(replaceResult, replaceExpected);
});

test("creates a relationship and replaces a property deep in the graph", async (t) => {
  const replaceResult = await t.context.store.replaceOne(
    { type: "bears", id: "5", relationships: { home: {} } },
    { type: "bears", id: "5", home: { id: "1", caring_meter: 0.3 } },
  );

  const replaceExpected = pickResources([
    ["bears", "5", { home: "1" }],
    ["homes", "1", { caring_meter: 0.3, bears: ["1", "2", "3", "5"] }],
  ]);

  t.deepEqual(replaceResult, replaceExpected);
});

test("resources can have properties named type that can be updated", async (t) => {
  const replaceResult = await t.context.store.replaceOne(
    { type: "powers", id: "careBearStare" },
    { id: "careBearStare", type: "bear power" },
  );

  const replaceExpected = pickResources([
    ["powers", "careBearStare", { type: "bear power" }],
  ]);

  t.deepEqual(replaceResult, replaceExpected);

  const getResult = await t.context.store.get({
    type: "powers",
    id: "careBearStare",
  });

  const expectedRes = { ...careBearData.powers.careBearStare, type: "bear power" };
  t.deepEqual(getResult, expectedRes);
});

// ----Replacement---------------------------------------------------------------------------------

test("replaces existing data completely given a new resource", async (t) => {
  const query = {
    type: "bears",
    relationships: {
      home: { referencesOnly: true },
      powers: { referencesOnly: true },
    },
  };

  const replaceResult = await t.context.store.replaceMany(query, [grumpyBear]);
  const replaceExpected = pickResources([
    ["bears", "1", null],
    ["bears", "2", null],
    ["bears", "3", null],
    ["bears", "4", grumpyBear],
    ["bears", "5", null],
    ["homes", "1", { bears: ["4"] }],
    ["powers", "careBearStare", { bears: ["4"] }],
  ]);

  t.deepEqual(replaceResult, replaceExpected);

  const getResult = await t.context.store.get({
    type: "bears",
  });

  t.deepEqual(getResult, [grumpyBear]);
});

test("replaces or keeps existing data given a new resources", async (t) => {
  const query = {
    type: "bears",
    relationships: {
      home: { referencesOnly: true },
      powers: { referencesOnly: true },
    },
  };

  const replaceResult = await t.context.store.replaceMany(
    query,
    [grumpyBear, careBearData.bears["1"]],
  );
  const replaceExpected = pickResources([
    ["bears", "1"],
    ["bears", "2", null],
    ["bears", "3", null],
    ["bears", "4", grumpyBear],
    ["bears", "5", null],
    ["homes", "1", { bears: ["1", "4"] }],
    ["powers", "careBearStare", { bears: ["1", "4"] }],
  ]);

  t.deepEqual(replaceResult, replaceExpected);

  const getResult = await t.context.store.get({
    type: "bears",
  });
  t.deepEqual(getResult, [careBearData.bears["1"], grumpyBear]);
});

// ----Relationships-------------------------------------------------------------------------------

test("replaces a one-to-one relationship", async (t) => {
  const replaceResult = await t.context.store.replaceOne(
    {
      type: "bears",
      id: "2",
      relationships: { home: {} },
    },
    { id: "2", home: { type: "homes", id: "2" } },
  );

  const replaceExpected = pickResources([
    ["bears", "2", { home: "2" }],
    ["homes", "1", { bears: ["1", "3"] }],
    ["homes", "2", { bears: ["2"] }],
  ]);
  t.deepEqual(replaceResult, replaceExpected);

  const bearResult = await t.context.store.get({
    type: "bears",
    id: "2",
    properties: ["belly_badge"],
    relationships: { home: {} },
  });

  t.is(bearResult.home.name, "Forest of Feelings");

  const careALotResult = await t.context.store.get({
    type: "homes",
    id: "1",
    relationships: { bears: {} },
  });

  t.is(careALotResult.bears.length, 2);
});

test("replaces a one-to-many-relationship", async (t) => {
  await t.context.store.replaceOne(
    { type: "homes", id: "1", relationships: { bears: { referencesOnly: true } } },
    {
      type: "homes",
      id: "1",
      bears: [{ type: "bears", id: "1" }, { type: "bears", id: "5" }],
    },
  );

  const bearResult = await t.context.store.get({
    type: "bears",
    id: "2",
    relationships: { home: {} },
  });

  t.is(bearResult.home, null);

  const smartHeartResult = await t.context.store.get({
    type: "bears",
    id: "5",
    relationships: { home: {} },
  });

  t.is(smartHeartResult.home.name, "Care-a-Lot");

  const careALotResult = await t.context.store.get({
    type: "homes",
    id: "1",
    relationships: { bears: {} },
  });

  t.is(careALotResult.bears.length, 2);
});
