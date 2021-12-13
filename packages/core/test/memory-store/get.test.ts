import anyTest, { TestInterface } from "ava";
import { schema } from "../fixtures/care-bear-schema";
import { makeMemoryStore } from "../../src/memory-store";
import {
  MemoryStore,
  NormalizedResources,
  QueryResultResource,
  ResourceOfType,
} from "../../src/types";
import { careBearData } from "../fixtures/care-bears-data";

const normalizedData = careBearData;

type S = typeof schema;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const empty: NormalizedResources<S> = {
  bears: {},
  companions: {},
  homes: {},
  powers: {},
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const emptyBear: ResourceOfType<S, "bears"> = {
  type: "bears",
  id: "3",
  properties: {
    name: "Tenderheart",
    belly_badge: "heart",
    year_introduced: 1982,
    fur_color: "tan",
  },
  relationships: {
    best_friend: null,
    home: null,
    powers: [],
  },
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const almostEmpty: NormalizedResources<S> = {
  ...empty,
  bears: {
    3: emptyBear,
  },
} as const;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const bearWithHome: ResourceOfType<S, "bears"> = {
  ...emptyBear,
  relationships: {
    ...emptyBear.relationships,
    home: { type: "homes", id: "33223" },
  },
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const bearWithBadHome: ResourceOfType<S, "bears"> = {
  ...emptyBear,
  relationships: {
    ...emptyBear.relationships,
    home: { type: "homes", id: "33223" }, // SHOULD NOT BE VALID!
  },
};

// Helper functions

const test = anyTest as TestInterface<{ store: MemoryStore<S> }>;

const resource = <ResType extends keyof S["resources"]>(
  type: ResType & string,
  id: string,
  getRels = true,
  overrides = {},
): QueryResultResource<S, ResType> => {
  const stored = normalizedData[type][id];
  const { properties, relationships } = stored;

  return {
    id,
    type,
    ...properties,
    ...(getRels ? relationships : {}),
    ...overrides,
  } as unknown as QueryResultResource<S, ResType>; // TODO: revisit this
};

// Test Setup

test.beforeEach(async (t) => {
  // eslint-disable-next-line no-param-reassign
  t.context = { store: await makeMemoryStore(schema, { initialData: normalizedData }) };
});

// Actual Tests

test("fetches a single resource", async (t) => {
  const result = await t.context.store.get({ type: "bears", id: "1" });

  t.deepEqual(result, resource("bears", "1"));
});

test("does not fetch a nonexistent resource", async (t) => {
  const result = await t.context.store.get({ type: "bears", id: "6" });

  t.deepEqual(result, null);
});

test("fetches multiple resources", async (t) => {
  const result = await t.context.store.get({ type: "bears" });
  const expected = ["1", "2", "3", "5"].map((id) => resource("bears", id));

  t.deepEqual(result, expected);
});

test("fetches a single resource specifying no relationships desired", async (t) => {
  const result = await t.context.store.get({ type: "bears", id: "1", relationships: {} });

  t.deepEqual(result, resource("bears", "1", false));
});

test("fetches a single resource with a single relationship", async (t) => {
  const q = {
    type: "bears",
    id: "1",
    relationships: { home: {} },
  } as const;

  const result = await t.context.store.get(q);

  t.deepEqual(result, resource("bears", "1", false, { home: resource("homes", "1") }));
});

test("fetches a single resource with a subset of properties", async (t) => {
  const result = await t.context.store.get({
    type: "bears",
    id: "1",
    properties: ["name", "fur_color"],
    relationships: {},
  });

  t.deepEqual(
    result,
    {
      type: "bears", id: "1", name: "Tenderheart Bear", fur_color: "tan",
    } as typeof result,
  );
});

// TODO: make types work on nested relationship properties, e.g. result.bears.home.name shouldn't exist
test("fetches a single resource with a subset of properties on a relationship", async (t) => {
  const q = {
    type: "bears",
    id: "1",
    relationships: { home: { properties: ["caring_meter"] } },
  } as const;

  const result = await t.context.store.get(q);

  t.like(
    result,
    resource("bears", "1", false, {
      home: {
        type: "homes",
        id: "1",
        caring_meter: 1,
      },
    }),
  );
});

test("fetches a single resource with many-to-many relationship", async (t) => {
  const result = await t.context.store.get({
    type: "bears",
    id: "1",
    relationships: { powers: {} },
  });

  t.deepEqual(
    result,
    resource("bears", "1", false, { powers: [resource("powers", "careBearStare")] }),
  );
});

test("fetches multiple relationships of various types", async (t) => {
  const result = await t.context.store.get({
    type: "bears",
    id: "1",
    relationships: {
      home: {
        relationships: {
          bears: {},
        },
      },
      powers: {},
    },
  });

  t.deepEqual(result, resource("bears", "1", false, {
    home: resource("homes", "1", false, {
      bears: ["1", "2", "3"].map((id) => resource("bears", id)),
    }),
    powers: [resource("powers", "careBearStare")],
  }));
});

test("handles relationships between the same type", async (t) => {
  const result = await t.context.store.get({
    type: "bears",
    relationships: {
      best_friend: {},
    },
  });

  t.deepEqual(result, [
    resource("bears", "1", false, { best_friend: null }),
    resource("bears", "2", false, { best_friend: resource("bears", "3") }),
    resource("bears", "3", false, { best_friend: resource("bears", "2") }),
    resource("bears", "5", false, { best_friend: null }),
  ]);
});
