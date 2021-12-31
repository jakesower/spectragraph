import anyTest, { TestInterface } from "ava";
import { mapObj, pick } from "@polygraph/utils";
import { schema } from "../fixtures/care-bear-schema";
import { makeMemoryStore } from "../../src/memory-store";
import {
  ExpandedSchema,
  MemoryStore,
  NormalizedResourceUpdates,
  ResourceOfType,
} from "../../src/types";
import { cardinalize } from "../../src/utils";
import { careBearData } from "../fixtures/care-bear-data";

type S = typeof schema;
const expandedSchema = schema as ExpandedSchema<S>;

const grumpyBear = {
  type: "bears",
  id: "4",
  properties: {
    name: "Grumpy Bear",
    year_introduced: 1982,
    belly_badge: "raincloud",
    fur_color: "blue",
  },
  relationships: {
    best_friend: null,
    home: { type: "homes", id: "1" },
    powers: [{ type: "powers", id: "careBearStare" }],
  },
} as ResourceOfType<S, "bears">;

const grumpyBearDT = {
  type: "bears",
  id: "4",
  name: "Grumpy Bear",
  gender: "male",
  year_introduced: 1982,
  belly_badge: "raincloud",
  fur_color: "blue",
  home: { type: "homes", id: "1" },
  powers: [{ type: "powers", id: "careBearStare" }],
};

const fullResource = <ResType extends keyof S["resources"]>(
  resource: ResourceOfType<S, ResType>,
  relOverrides = {},
): ResourceOfType<S, ResType> => {
  const {
    id, type, properties, relationships: existingRelationships,
  } = resource;
  const resDef = expandedSchema.resources[type];
  const emptyRelationships = mapObj(resDef.relationships, (relDef) => cardinalize([], relDef));
  const relationships = {
    ...emptyRelationships,
    ...existingRelationships,
    ...relOverrides,
  };

  return {
    id,
    type,
    properties,
    relationships,
  };
};

const fullResourceFromRef = (type, id, relOverrides) => (
  fullResource(careBearData[type][id], relOverrides)
);

const dataTree = (res, rels = null) => {
  const { id, type, properties } = res;
  const resSchemaDef = schema.resources[type];

  const allRels = rels || Object.keys(resSchemaDef.relationships);
  return {
    type,
    id,
    ...properties,
    ...pick(res.relationships, allRels),
  };
};

type PickRef = [keyof S["resources"], string];
type PickRefWithOverrides = [
  keyof S["resources"],
  string,
  null | {
    properties?: Record<any, any>,
    relationships?: Record<string, string | string[]>,
    [k: string]: any,
  },
];

type PickInput = PickRef | PickRefWithOverrides | ResourceOfType<S, any>;

const pickResources = (resInputs: PickInput[]): NormalizedResourceUpdates<S> => {
  const subGraph = {
    bears: {}, companions: {}, homes: {}, powers: {},
  };

  resInputs.forEach((input) => {
    if (!Array.isArray(input)) {
      subGraph[input.type][input.id] = input;
    } else {
      const [type, id, overrides = {}] = input;

      if (overrides === null) {
        subGraph[type][id] = null;
      } else {
        const base = careBearData[type][id];
        const overrideRels = mapObj(
          overrides.relationships || {},
          (relIds, relType) => {
            const resDef = schema.resources[type].relationships[relType];
            const toRef = (idOrRef) => ((typeof idOrRef === "string")
              ? { type: resDef.type, id: idOrRef }
              : idOrRef);
            return Array.isArray(relIds)
              ? relIds.map(toRef)
              : toRef(relIds);
          },
        );

        subGraph[type][id] = {
          ...base,
          properties: { ...base.properties, ...(overrides.properties || {}) },
          relationships: { ...base.relationships, ...overrideRels },
        };
      }
    }
  });

  return subGraph;
};

function resultData(result) {
  return result.isValid
    ? result.data
    : result;
}

const test = anyTest as TestInterface<{ store: MemoryStore<S> }>;

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
        properties: {
          name: "Friend",
          recurs: false,
        },
      },
    },
  };

  t.like(resultData(createResult), createExpected);
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
        properties: {
          name: "Friend",
          recurs: true,
        },
      },
    },
  };

  t.like(resultData(createResult), createExpected);
});

test("does not fail when creating a resource without an optional property", async (t) => {
  const createResult = await t.context.store.replaceOne(
    { type: "companions", id: "nobody" },
    { type: "companions", id: "nobody" },
  );
  const createExpected = {
    companions: {
      nobody: {
        properties: {
          name: undefined,
          recurs: false,
        },
      },
    },
  };

  t.like(resultData(createResult), createExpected);
});

test("replaces a property", async (t) => {
  const replaceResult = await t.context.store.replaceOne(
    { type: "bears", id: "5" },
    { type: "bears", id: "5", fur_color: "brink pink" },
  );
  const replaceExpected = pickResources([
    ["bears", "5", { properties: { fur_color: "brink pink" } }],
  ]);

  t.deepEqual(resultData(replaceResult), replaceExpected);
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
        properties: {
          name: "Bob",
          recurs: true,
        },
      },
    },
  };

  t.like(replaceResult.isValid && replaceResult.data, replaceExpected);
});

test("replaces a property deep in the graph", async (t) => {
  const replaceResult = await t.context.store.replaceOne(
    { type: "bears", id: "1", relationships: { home: {} } },
    { type: "bears", id: "1", home: { id: "1", caring_meter: 0.4 } },
  );

  const replaceExpected = pickResources([
    ["bears", "1"],
    ["homes", "1", { properties: { caring_meter: 0.4 } }],
  ]);

  t.deepEqual(replaceResult.isValid && replaceResult.data, replaceExpected);
});

test("creates a relationship and replaces a property deep in the graph", async (t) => {
  const replaceResult = await t.context.store.replaceOne(
    { type: "bears", id: "5", relationships: { home: {} } },
    { type: "bears", id: "5", home: { id: "1", caring_meter: 0.3 } },
  );

  const replaceExpected = pickResources([
    ["bears", "5", { relationships: { home: "1" } }],
    ["homes", "1", {
      properties: { caring_meter: 0.3 },
      relationships: { bears: ["1", "2", "3", "5"] },
    }],
  ]);

  t.deepEqual(replaceResult.isValid && replaceResult.data, replaceExpected);
});

test("resources can have properties named type that can be updated", async (t) => {
  const replaceResult = await t.context.store.replaceOne(
    { type: "powers", id: "careBearStare" },
    { id: "careBearStare", type: "bear power" },
  );

  const replaceExpected = pickResources([
    ["powers", "careBearStare", { properties: { type: "bear power" } }],
  ]);

  t.deepEqual(replaceResult.isValid && replaceResult.data, replaceExpected);

  const getResult = await t.context.store.get({
    type: "powers",
    id: "careBearStare",
  });

  const expectedRes = { ...dataTree(careBearData.powers.careBearStare), type: "bear power" };
  t.deepEqual(getResult, expectedRes);
});

// ----Replacement---------------------------------------------------------------------------------

test("replaces existing data completely given a new resource", async (t) => {
  const query = { type: "bears" } as const;

  const replaceResult = await t.context.store.replaceMany(query, [grumpyBearDT]);
  const replaceExpected = pickResources([
    ["bears", "1", null],
    ["bears", "2", null],
    ["bears", "3", null],
    grumpyBear,
    ["bears", "5", null],
    ["homes", "1", { relationships: { bears: ["4"] } }],
    ["powers", "careBearStare", { relationships: { bears: ["4"] } }],
  ]);

  t.deepEqual(replaceResult.isValid && replaceResult.data, replaceExpected);

  const getResult = await t.context.store.get({
    type: "bears",
  });
  t.deepEqual(getResult, [dataTree(grumpyBear)]);
});

test("replaces or keeps existing data given a new resources", async (t) => {
  const query = { type: "bears" } as const;

  const replaceResult = await t.context.store.replaceMany(
    query,
    [grumpyBearDT, careBearData.bears["1"]],
  );
  const replaceExpected: NormalizedResourceUpdates<S> = pickResources([
    ["bears", "1"],
    ["bears", "2", null],
    ["bears", "3", null],
    grumpyBear,
    ["bears", "5", null],
    ["homes", "1", { relationships: { bears: ["1", "4"] } }],
    ["powers", "careBearStare", { relationships: { bears: ["1", "4"] } }],
  ]);

  t.deepEqual(resultData(replaceResult), replaceExpected);

  const getResult = await t.context.store.get({
    type: "bears",
  });
  t.deepEqual(getResult, [dataTree(careBearData.bears["1"]), dataTree(grumpyBear)]);
});

// ----Relationships-------------------------------------------------------------------------------

test("replaces a one-to-one relationship", async (t) => {
  const replaceResult = await t.context.store.replaceOne(
    {
      type: "bears",
      id: "2",
      relationships: { home: {} },
    },
    { type: "bears", id: "2", home: { type: "homes", id: "2" } },
  );

  const replaceExpected = {
    bears: {
      2: fullResourceFromRef("bears", "2",
        { home: { type: "homes", id: "2" } }),
    },
    companions: {},
    homes: {
      1: fullResourceFromRef("homes", "1", {
        bears: [{ type: "bears", id: "1" }, { type: "bears", id: "3" }],
      }),
      2: fullResourceFromRef("homes", "2", {
        bears: [{ type: "bears", id: "2" }],
      }),
    },
    powers: {},
  };
  t.deepEqual(resultData(replaceResult), replaceExpected);

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
    { type: "homes", id: "1" },
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
