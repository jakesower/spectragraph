import test from "ava";
import { schema } from "./care-bear-schema";
import { MemoryStore } from "../src/memory-store";

const normalizedData = {
  bears: {
    1: {
      name: "Tenderheart Bear",
      gender: "male",
      belly_badge: "heart",
      fur_color: "tan",
      home: "1",
      powers: ["careBearStare"],
    },
    2: {
      name: "Cheer Bear",
      gender: "female",
      belly_badge: "rainbow",
      fur_color: "carnation pink",
      home: "1",
      powers: ["careBearStare"],
      best_friend: "3",
    },
    3: {
      name: "Wish Bear",
      gender: "female",
      belly_badge: "shooting star",
      fur_color: "turquoise",
      home: "1",
      powers: ["careBearStare"],
      best_friend: "2",
    },
    5: {
      name: "Wonderheart Bear",
      gender: "female",
      belly_badge: "three hearts",
      fur_color: "pink",
      home: null,
      powers: ["careBearStare"],
    },
  },
  homes: {
    1: {
      name: "Care-a-Lot",
      location: "Kingdom of Caring",
      caring_meter: 1,
      bears: ["1", "2", "3"],
    },
    2: {
      name: "Forest of Feelings",
      location: "Kingdom of Caring",
      caring_meter: 1,
      bears: [],
    },
  },
  powers: {
    careBearStare: {
      name: "Care Bear Stare",
      description: "Purges evil.",
      bears: ["1", "2", "3", "5"],
    },
    makeWish: {
      name: "Make a Wish",
      description: "Makes a wish on Twinkers",
      bears: [],
    },
  },
};

const grumpyBear = {
  type: "bears",
  id: "4",
  attributes: {
    name: "Grumpy Bear",
    gender: "male",
    belly_badge: "raincloud",
    fur_color: "blue",
    home: "1",
    powers: ["careBearStare"],
  },
};

const resource = (type, id, overrides) => ({
  id,
  type,
  attributes: { ...normalizedData[type][id], ...overrides },
});

test.beforeEach(async (t) => {
  t.context = { store: MemoryStore(schema, { initialData: normalizedData }) };
});

test("fetches a single resource", async (t) => {
  const result = await t.context.store.query({ type: "bears", id: "1" });

  t.deepEqual(result, {
    type: "bears",
    id: "1",
    attributes: normalizedData.bears["1"],
  });
});

test("does not fetch a nonexistent resource", async (t) => {
  const result = await t.context.store.query({ type: "bears", id: "6" });

  t.deepEqual(result, null);
});

test("fetches multiple resources", async (t) => {
  const result = await t.context.store.query({ type: "bears" });

  t.deepEqual(result, [
    {
      type: "bears",
      id: "1",
      attributes: normalizedData.bears["1"],
    },
    {
      type: "bears",
      id: "2",
      attributes: normalizedData.bears["2"],
    },
    {
      type: "bears",
      id: "3",
      attributes: normalizedData.bears["3"],
    },
    {
      type: "bears",
      id: "5",
      attributes: normalizedData.bears["5"],
    },
  ]);
});

test("fetches a single resource with a single relationship", async (t) => {
  const result = await t.context.store.query({
    type: "bears",
    id: "1",
    relationships: { home: {} },
  });

  t.deepEqual(result, {
    type: "bears",
    id: "1",
    attributes: {
      ...normalizedData.bears["1"],
      home: {
        type: "homes",
        id: "1",
        attributes: normalizedData.homes["1"],
      },
    },
  });
});

test("fetches a single resource with many-to-many relationship", async (t) => {
  const result = await t.context.store.query({
    type: "bears",
    id: "1",
    relationships: { powers: {} },
  });

  t.deepEqual(result, {
    type: "bears",
    id: "1",
    attributes: {
      ...normalizedData.bears["1"],
      powers: [
        {
          type: "powers",
          id: "careBearStare",
          attributes: normalizedData.powers["careBearStare"],
        },
      ],
    },
  });
});

test("fetches multiple relationships of various types", async (t) => {
  const result = await t.context.store.query({
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

  t.deepEqual(result, {
    type: "bears",
    id: "1",
    attributes: {
      ...normalizedData.bears["1"],
      home: {
        type: "homes",
        id: "1",
        attributes: {
          ...normalizedData.homes["1"],
          bears: [
            {
              type: "bears",
              id: "1",
              attributes: normalizedData.bears["1"],
            },
            {
              type: "bears",
              id: "2",
              attributes: normalizedData.bears["2"],
            },
            {
              type: "bears",
              id: "3",
              attributes: normalizedData.bears["3"],
            },
          ],
        },
      },
      powers: [
        {
          type: "powers",
          id: "careBearStare",
          attributes: normalizedData.powers.careBearStare,
        },
      ],
    },
  });
});

test("handles relationships between the same type", async (t) => {
  const result = await t.context.store.query({
    type: "bears",
    relationships: {
      best_friend: {},
    },
  });

  t.deepEqual(result, [
    {
      type: "bears",
      id: "1",
      attributes: { ...normalizedData.bears["1"], best_friend: null },
    },
    {
      type: "bears",
      id: "2",
      attributes: {
        ...normalizedData.bears["2"],
        best_friend: {
          type: "bears",
          id: "3",
          attributes: normalizedData.bears["3"],
        },
      },
    },
    {
      type: "bears",
      id: "3",
      attributes: {
        ...normalizedData.bears["3"],
        best_friend: {
          type: "bears",
          id: "2",
          attributes: normalizedData.bears["2"],
        },
      },
    },
    {
      type: "bears",
      id: "5",
      attributes: { ...normalizedData.bears["5"], best_friend: null },
    },
  ]);
});

// merge stuff

test("creates new objects without relationships via merge", async (t) => {
  await t.context.store.merge({ type: "bears" }, [grumpyBear]);

  const result = await t.context.store.query({
    type: "bears",
    id: "4",
  });

  t.deepEqual(result, grumpyBear);
});

test("creates new objects with a relationship via merge", async (t) => {
  await t.context.store.merge(
    { type: "bears", id: "4" },
    {
      ...grumpyBear,
      relationships: { home: "1" },
    }
  );

  const result = await t.context.store.query({
    type: "bears",
    id: "4",
    relationships: { home: {} },
  });

  t.deepEqual(result, {
    type: "bears",
    id: "4",
    attributes: {
      ...grumpyBear.attributes,
      home: {
        type: "homes",
        id: "1",
        attributes: {
          ...resource("homes", "1").attributes,
          bears: [...resource("homes", "1").attributes.bears, "4"],
        },
      },
    },
  });
});

test("merges into existing objects", async (t) => {
  await t.context.store.merge(
    { type: "bears", id: "2" },
    {
      type: "bears",
      id: "2",
      attributes: { fur_color: "just pink" },
    }
  );;;;;;;;

  const result = await t.context.store.query({
    type: "bears",
    id: "2",
  });

  t.deepEqual(result, {
    type: "bears",
    id: "2",
    attributes: { ...normalizedData.bears["2"], fur_color: "just pink" },
  });
});

test("merges into one-to-many relationship", async (t) => {
  await t.context.store.merge(
    { type: "bears", id: "1" },
    {
      type: "bears",
      id: "1",
      attributes: { home: "2" },
    }
  );

  const result = await t.context.store.query({
    type: "bears",
    id: "1",
    relationships: { home: {} },
  });

  t.deepEqual(
    result,
    resource("bears", "1", {
      home: resource("homes", "2", { bears: ["1"] }),
    })
  );
});

test("merges into many-to-one relationship", async (t) => {
  await t.context.store.merge(
    {
      type: "homes",
      id: "1",
    },
    resource("homes", "1", { bears: ["1"] })
  );

  const result = await t.context.store.query({
    type: "homes",
    id: "1",
    relationships: { bears: {} },
  });

  t.deepEqual(
    result,
    resource("homes", "1", {
      bears: [resource("bears", "1", { home: "1" })],
    })
  );
});

test("merges into many-to-many relationship", async (t) => {
  await t.context.store.merge(
    {
      type: "powers",
      id: "makeWish",
    },
    resource("powers", "makeWish", { bears: ["3"] })
  );

  const result = await t.context.store.query({
    type: "powers",
    id: "makeWish",
    relationships: { bears: {} },
  });

  t.deepEqual(
    result,
    resource("powers", "makeWish", {
      bears: [
        resource("bears", "3", { powers: ["careBearStare", "makeWish"] }),
      ],
    })
  );
});

// replace tests
test("replaces data en masse with replace", async (t) => {
  await t.context.store.replace({ type: "bears" }, [grumpyBear]);

  const result = await t.context.store.query({
    type: "bears",
  });

  t.deepEqual(result, [grumpyBear]);
});

test.skip("replaces a one-to-one relationship", async (t) => {
  await t.context.store.replaceRelationship({
    type: "bears",
    id: "2",
    relationship: "home",
    foreignId: "2",
  });

  const bearResult = await t.context.store.query({
    type: "bears",
    id: "2",
    relationships: { home: {} },
  });

  t.is(bearResult.relationships.home.attributes.name, "Forest of Feelings");

  const careALotResult = await t.context.store.query({
    type: "homes",
    id: "1",
    relationships: { bears: {} },
  });

  t.is(careALotResult.relationships.bears.length, 2);
});

test.skip("replaces a one-to-many-relationship", async (t) => {
  await t.context.store.replaceRelationships({
    type: "homes",
    id: "1",
    relationship: "bears",
    foreignIds: ["1", "5"],
  });

  const bearResult = await t.context.store.query({
    type: "bears",
    id: "2",
    relationships: { home: {} },
  });

  t.is(bearResult.relationships.home, null);

  const wonderheartResult = await t.context.store.query({
    type: "bears",
    id: "5",
    relationships: { home: {} },
  });

  t.is(wonderheartResult.relationships.home.attributes.name, "Care-a-Lot");

  const careALotResult = await t.context.store.query({
    type: "homes",
    id: "1",
    relationships: { bears: {} },
  });

  t.is(careALotResult.relationships.bears.length, 2);
});

test.skip("appends to a to-many relationship", async (t) => {
  await t.context.store.appendRelationships({
    type: "homes",
    id: "1",
    relationship: "bears",
    foreignIds: ["5"],
  });

  const bearResult = await t.context.store.query({
    type: "bears",
    id: "5",
    relationships: { home: {} },
  });

  t.is(bearResult.relationships.home.attributes.name, "Care-a-Lot");

  const careALotResult = await t.context.store.query({
    type: "homes",
    id: "1",
    relationships: { bears: {} },
  });

  t.is(careALotResult.relationships.bears.length, 4);
});

test.skip("deletes a to-one relationship", async (t) => {
  await t.context.store.deleteRelationship({
    type: "bears",
    id: "1",
    relationship: "home",
  });

  const bearResult = await t.context.store.query({
    type: "bears",
    id: "1",
    relationships: { home: {} },
  });

  t.is(bearResult.relationships.home, null);

  const careALotResult = await t.context.store.query({
    type: "homes",
    id: "1",
    relationships: { bears: {} },
  });

  t.is(careALotResult.relationships.bears.length, 2);
});

test.skip("deletes a to-many relationship", async (t) => {
  await t.context.store.deleteRelationships({
    type: "homes",
    id: "1",
    relationship: "bears",
    foreignIds: ["2"],
  });

  const bearResult = await t.context.store.query({
    type: "bears",
    id: "2",
    relationships: { home: {} },
  });

  t.is(bearResult.relationships.home, null);

  const careALotResult = await t.context.store.query({
    type: "homes",
    id: "1",
    relationships: { bears: {} },
  });

  t.is(careALotResult.relationships.bears.length, 2);
});
