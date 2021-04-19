import test from "ava";
import { schema } from "./care-bear-schema";
import { operations } from "../src/operations";

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

const resource = (type, id, overrides = {}) => ({
  id,
  type,
  attributes: { ...normalizedData[type][id], ...overrides },
});

test.beforeEach(async (t) => {
  console.log({ operations });
  t.context = operations(schema, normalizedData);
});

test("fetches a single resource", async (t) => {
  const result = await t.context.store.read({ type: "bears", id: "1" });
  t.deepEqual(result, resource("bears", "1"));
});

test("does not fetch a nonexistent resource", async (t) => {
  const result = await t.context.store.read({ type: "bears", id: "6" });
  t.deepEqual(result, null);
});

test("creates new objects without relationships", async (t) => {
  const lonelyGrumpy = {
    ...grumpyBear,
    attributes: { ...grumpyBear.attributes, home: null, powers: [] },
  };
  await t.context.store.create(lonelyGrumpy);

  const result = await t.context.store.read({
    type: "bears",
    id: "4",
  });

  t.deepEqual(result, lonelyGrumpy);
});

test("creates new objects with a one-to-one relationship", async (t) => {
  const friendlyGrumpy = {
    ...grumpyBear,
    attributes: { ...grumpyBear.attributes, best_friend: "1" },
  };
  await t.context.store.create(friendlyGrumpy);

  const grumpyResult = await t.context.store.read({
    type: "bears",
    id: "4",
  });

  t.deepEqual(grumpyResult, friendlyGrumpy);

  const friendResult = await t.context.store.read({
    type: "bears",
    id: "1",
  });

  t.deepEqual(friendResult, resource("bears", "1", { best_friend: "4" }));
});

test("creates new objects with a one-to-one relationship replacing an existing one", async (t) => {
  const superFriendlyGrumpy = {
    ...grumpyBear,
    attributes: { ...grumpyBear.attributes, best_friend: "2" },
  };
  await t.context.store.create(superFriendlyGrumpy);

  const grumpyResult = await t.context.store.read({
    type: "bears",
    id: "4",
  });

  t.deepEqual(grumpyResult, superFriendlyGrumpy);

  const friendResult = await t.context.store.read({
    type: "bears",
    id: "2",
  });

  t.deepEqual(friendResult, resource("bears", "2", { best_friend: "4" }));

  const lonelyResult = await t.context.store.read({
    type: "bears",
    id: "3",
  });

  t.deepEqual(lonelyResult, resource("bears", "3", { best_friend: null }));
});

test("creates new objects with a one-to-many relationship", async (t) => {
  const homelyGrumpy = {
    ...grumpyBear,
    attributes: { ...grumpyBear.attributes, home: "2" },
  };
  await t.context.store.create(homelyGrumpy);

  const bearResult = await t.context.store.read({
    type: "bears",
    id: "4",
  });

  t.deepEqual(bearResult, {
    type: "bears",
    id: "4",
    attributes: {
      ...homelyGrumpy.attributes,
      home: "2",
    },
  });

  const homeResult = await t.context.store.read({
    type: "homes",
    id: "2",
  });

  t.deepEqual(homeResult, resource("homes", "2", { bears: ["4"] }));
});

test("creates new objects with a many-to-one relationship", async (t) => {
  const newHome = {
    id: "3",
    type: "homes",
    attributes: {
      name: "Joke-a-Lot",
      location: "somewhere near Care-a-Lot",
      caring_meter: 0.7,
      bears: ["3"],
    },
  };
  await t.context.store.create(newHome);

  const downsizedHome = await t.context.store.read(resource("homes", "3"));
  t.deepEqual(downsizedHome, {
    ...newHome,
    attributes: { ...newHome.attributes, bears: ["3"] },
  });

  const bearResult = await t.context.store.read(resource("bears", "1"));
  t.deepEqual(bearResult, resource("bears", "1"));

  const relocatedResult = await t.context.store.read(resource("bears", "3"));
  t.deepEqual(relocatedResult, resource("bears", "3", { home: "3" }));
});

test("creates new objects with a many-to-many relationship", async (t) => {
  const newPower = {
    id: "careCousinsCall",
    type: "powers",
    attributes: {
      name: "Care Cousins Call",
      description: "Knockoff care bear stare",
      bears: ["3"],
    },
  };
  await t.context.store.create(newPower);

  const extraPower = await t.context.store.read(
    resource("powers", "careCousinsCall")
  );
  t.deepEqual(extraPower, newPower);

  const bearResult = await t.context.store.read(resource("bears", "1"));
  t.deepEqual(bearResult, resource("bears", "1"));

  const extraPowerBear = await t.context.store.read(resource("bears", "3"));
  t.deepEqual(
    extraPowerBear,
    resource("bears", "3", { powers: ["careBearStare", "careCousinsCall"] })
  );
});

test("updates objects with a one-to-one relationship", async (t) => {
  await t.context.store.update(resource("bears", "1", { best_friend: "2" }));

  const updatedResult = await t.context.store.read({
    type: "bears",
    id: "1",
  });
  t.deepEqual(updatedResult, resource("bears", "1", { best_friend: "2" }));

  const friendResult = await t.context.store.read({
    type: "bears",
    id: "2",
  });
  t.deepEqual(friendResult, resource("bears", "2", { best_friend: "1" }));

  const formerResult = await t.context.store.read({
    type: "bears",
    id: "3",
  });
  t.deepEqual(formerResult, resource("bears", "3", { best_friend: null }));
});

test("updates objects with a one-to-many relationship", async (t) => {
  await t.context.store.update(
    resource("bears", "1", { powers: ["makeWish"] })
  );

  const bearResult = await t.context.store.read({
    type: "bears",
    id: "1",
  });
  t.deepEqual(bearResult, resource("bears", "1", { powers: ["makeWish"] }));

  const addedPowerResult = await t.context.store.read({
    type: "powers",
    id: "makeWish",
  });
  t.deepEqual(
    addedPowerResult,
    resource("powers", "makeWish", { bears: ["1"] })
  );

  const removedPowerResult = await t.context.store.read({
    type: "powers",
    id: "careBearStare",
  });
  t.deepEqual(
    removedPowerResult,
    resource("powers", "careBearStare", { bears: ["2", "3", "5"] })
  );
});

test("updates objects with a many-to-one relationship", async (t) => {
  await t.context.store.update({
    type: "homes",
    id: "1",
    attributes: { bears: ["1"] },
  });

  const downsizedHome = await t.context.store.read(resource("homes", "1"));
  t.deepEqual(downsizedHome, resource("homes", "1", { bears: ["1"] }));

  const bearResult = await t.context.store.read(resource("bears", "1"));
  t.deepEqual(bearResult, resource("bears", "1"));

  ["2", "3"].forEach(async (id) => {
    const evictedBear = await t.context.store.read(resource("bears", id));
    t.deepEqual(evictedBear, resource("bears", id, { home: null }));
  });
});

test("updates with many-to-many relationship", async (t) => {
  await t.context.store.update(
    resource("powers", "makeWish", { bears: ["3"] })
  );
  await t.context.store.update(
    resource("powers", "careBearStare", {
      bears: ["1", "3"],
    })
  );

  const wishResult = await t.context.store.read(resource("powers", "makeWish"));
  t.deepEqual(wishResult, resource("powers", "makeWish", { bears: ["3"] }));

  const stareResult = await t.context.store.read(
    resource("powers", "careBearStare")
  );
  t.deepEqual(
    stareResult,
    resource("powers", "careBearStare", { bears: ["1", "3"] })
  );

  const sameBear = await t.context.store.read(resource("bears", "1"));
  t.deepEqual(sameBear, resource("bears", "1"));

  const disempoweredBear = await t.context.store.read(resource("bears", "2"));
  t.deepEqual(disempoweredBear, resource("bears", "2", { powers: [] }));

  const superBear = await t.context.store.read(resource("bears", "3"));
  t.deepEqual(
    superBear,
    resource("bears", "3", { powers: ["careBearStare", "makeWish"] })
  );
});

test("deletes objects with a one-to-one relationship", async (t) => {
  await t.context.store.delete(resource("bears", "2"));

  const updatedResult = await t.context.store.read({
    type: "bears",
    id: "2",
  });
  t.deepEqual(updatedResult, null);

  const friendResult = await t.context.store.read({
    type: "bears",
    id: "3",
  });
  t.deepEqual(friendResult, resource("bears", "3", { best_friend: null }));
});

test("deletes objects with a one-to-many relationship", async (t) => {
  await t.context.store.delete(resource("bears", "1"));

  const bearResult = await t.context.store.read({
    type: "bears",
    id: "1",
  });
  t.deepEqual(bearResult, null);

  const removedPowerResult = await t.context.store.read({
    type: "powers",
    id: "careBearStare",
  });
  t.deepEqual(
    removedPowerResult,
    resource("powers", "careBearStare", { bears: ["2", "3", "5"] })
  );
});

test("deletes objects with a many-to-one relationship", async (t) => {
  await t.context.store.delete({
    type: "homes",
    id: "1",
  });

  const downsizedHome = await t.context.store.read(resource("homes", "1"));
  t.deepEqual(downsizedHome, null);

  ["1", "2", "3", "5"].forEach(async (id) => {
    const evictedBear = await t.context.store.read(resource("bears", id));
    t.deepEqual(evictedBear, resource("bears", id, { home: null }));
  });
});

test("deletes many-to-many relationship", async (t) => {
  await t.context.store.delete(resource("powers", "careBearStare"));

  const stareResult = await t.context.store.read(
    resource("powers", "careBearStare")
  );
  t.deepEqual(stareResult, null);

  ["1", "2", "3", "5"].forEach(async (id) => {
    const evictedBear = await t.context.store.read(resource("bears", id));
    t.deepEqual(evictedBear, resource("bears", id, { powers: [] }));
  });
});
