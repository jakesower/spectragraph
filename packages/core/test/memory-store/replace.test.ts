import anyTest, { TestInterface } from "ava";
import { mapObj, pick } from "@polygraph/utils";
import { schema } from "../care-bear-schema";
import { makeMemoryStore } from "../../src/memory-store";
import {
  CompiledExpandedQuery,
  CompiledExpandedSubQuery,
  CompiledQuery,
  CompiledRefQuery,
  CompiledSubQuery,
  Expand,
  ExpandedSchema,
  MemoryStore, NormalizedResources, NormalizedResourceUpdates, ResourceOfType,
} from "../../src/types";
import { cardinalize } from "../../src/utils";

type S = typeof schema;
const expandedSchema = schema as ExpandedSchema<S>;
type XS = typeof expandedSchema;

const normalizedData = {
  bears: {
    1: {
      type: "bears",
      id: "1",
      properties: {
        name: "Tenderheart Bear",
        gender: "male",
        belly_badge: "heart",
        fur_color: "tan",
      },
      relationships: {
        best_friend: null,
        home: { type: "homes", id: "1" },
        powers: [{ type: "powers", id: "careBearStare" }],
      },
    },
    2: {
      type: "bears",
      id: "2",
      properties: {
        name: "Cheer Bear",
        gender: "female",
        belly_badge: "rainbow",
        fur_color: "carnation pink",
      },
      relationships: {
        home: { type: "homes", id: "1" },
        powers: [{ type: "powers", id: "careBearStare" }],
        best_friend: { type: "bears", id: "3" },
      },
    },
    3: {
      type: "bears",
      id: "3",
      properties: {
        name: "Wish Bear",
        gender: "female",
        belly_badge: "shooting star",
        fur_color: "turquoise",
      },
      relationships: {
        home: { type: "homes", id: "1" },
        powers: [{ type: "powers", id: "careBearStare" }],
        best_friend: { type: "bears", id: "2" },
      },
    },
    5: {
      type: "bears",
      id: "5",
      properties: {
        name: "Wonderheart Bear",
        gender: "female",
        belly_badge: "three hearts",
        fur_color: "pink",
      },
      relationships: {
        best_friend: null,
        home: null,
        powers: [{ type: "powers", id: "careBearStare" }],
      },
    },
  },
  homes: {
    1: {
      type: "homes",
      id: "1",
      properties: {
        name: "Care-a-Lot",
        location: "Kingdom of Caring",
        caring_meter: 1,
      },
      relationships: {
        bears: [{ type: "bears", id: "1" }, { type: "bears", id: "2" }, { type: "bears", id: "3" }],
      },
    },
    2: {
      type: "homes",
      id: "2",
      properties: {
        name: "Forest of Feelings",
        location: "Kingdom of Caring",
        caring_meter: 1,
      },
      relationships: {
        bears: [],
      },
    },
  },
  powers: {
    careBearStare: {
      type: "powers",
      id: "careBearStare",
      properties: {
        name: "Care Bear Stare",
        description: "Purges evil.",
      },
      relationships: { bears: [{ type: "bears", id: "1" }, { type: "bears", id: "2" }, { type: "bears", id: "3" }, { type: "bears", id: "5" }] },
    },
    makeWish: {
      type: "powers",
      id: "makeWish",
      properties: {
        name: "Make a Wish",
        description: "Makes a wish on Twinkers",
      },
      relationships: {
        bears: [],
      },
    },
  },
} as NormalizedResources<S>;

const grumpyBear = {
  type: "bears",
  id: "4",
  properties: {
    name: "Grumpy Bear",
    gender: "male",
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
  fullResource(normalizedData[type][id], relOverrides)
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

const test = anyTest as TestInterface<{ store: MemoryStore<S> }>;

test.beforeEach(async (t) => {
  // eslint-disable-next-line no-param-reassign
  t.context = { store: await makeMemoryStore(schema, { initialData: normalizedData }) };
});

test("replaces data en masse with replace", async (t) => {
  const query = { type: "bears" } as const;

  const replaceResult = await t.context.store.replaceMany(query, [grumpyBearDT]);
  const replaceExpected: NormalizedResourceUpdates<S> = {
    bears: {
      1: null,
      2: null,
      3: null,
      4: fullResource(grumpyBear, {
        best_friend: null,
        home: { type: "homes", id: "1" },
        powers: [{ type: "powers", id: "careBearStare" }],
      }),
      5: null,
    },
    homes: {
      1: {
        type: "homes",
        id: "1",
        properties: {
          name: "Care-a-Lot",
          location: "Kingdom of Caring",
          caring_meter: 1,
        },
        relationships: {
          bears: [{ type: "bears", id: "4" }],
        },
      },
    },
    powers: {
      careBearStare: {
        type: "powers",
        id: "careBearStare",
        properties: {
          name: "Care Bear Stare",
          description: "Purges evil.",
        },
        relationships: { bears: [{ type: "bears", id: "4" }] },
      },
    },
  };

  t.deepEqual(replaceResult, replaceExpected);

  const getResult = await t.context.store.get({
    type: "bears",
  });
  // t.deepEqual(getResult, [dataTree(grumpyBear)]);
});

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
  // t.deepEqual(replaceResult, replaceExpected);

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

  const wonderheartResult = await t.context.store.get({
    type: "bears",
    id: "5",
    relationships: { home: {} },
  });

  t.is(wonderheartResult.home.name, "Care-a-Lot");

  const careALotResult = await t.context.store.get({
    type: "homes",
    id: "1",
    relationships: { bears: {} },
  });

  t.is(careALotResult.bears.length, 2);
});
