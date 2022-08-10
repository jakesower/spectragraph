import test from "ava";
import Database from "better-sqlite3";
import { careBearSchema as schema } from "../../fixtures/care-bear-schema.mjs";
import { SQLiteStore } from "../../../src/sqlite-store.mjs";
import { careBearData } from "../../fixtures/care-bear-data.mjs";
import { createTables, seed } from "../../../src/actions/seed.mjs";

const nameLengthSorter = (leftName, rightName) => leftName.length - rightName.length;
const nameLengthAndYearSorter = (left, right) =>
  left.name.length - left.year_introduced - (right.name.length - right.year_introduced);

// Test Setup
test.beforeEach(async (t) => {
  const db = Database(":memory:");
  createTables(schema, db);
  seed(schema, db, careBearData);

  const store = await SQLiteStore(schema, db, {
    orderingFunctions: { nameLengthAndYearSorter, nameLengthSorter },
  });

  // eslint-disable-next-line no-param-reassign
  t.context = { store };
});

test("sorts on a numeric field", async (t) => {
  const result = await t.context.store.get({
    type: "bears",
    props: ["name", "year_introduced"],
    order: [{ property: "year_introduced", direction: "desc" }],
  });

  t.deepEqual(result, [
    { id: "5", name: "Smart Heart Bear", year_introduced: 2005 },
    { id: "1", name: "Tenderheart Bear", year_introduced: 1982 },
    { id: "2", name: "Cheer Bear", year_introduced: 1982 },
    { id: "3", name: "Wish Bear", year_introduced: 1982 },
  ]);
});

test("sorts on a string field", async (t) => {
  const result = await t.context.store.get({
    type: "bears",
    props: ["name", "year_introduced"],
    order: [{ property: "name", direction: "asc" }],
  });

  t.deepEqual(result, [
    { id: "2", name: "Cheer Bear", year_introduced: 1982 },
    { id: "5", name: "Smart Heart Bear", year_introduced: 2005 },
    { id: "1", name: "Tenderheart Bear", year_introduced: 1982 },
    { id: "3", name: "Wish Bear", year_introduced: 1982 },
  ]);
});

test("sorts on a numerical and a string field", async (t) => {
  const result = await t.context.store.get({
    type: "bears",
    props: ["name", "year_introduced"],
    order: [
      { property: "year_introduced", direction: "desc" },
      { property: "name", direction: "asc" },
    ],
  });

  t.deepEqual(result, [
    { id: "5", name: "Smart Heart Bear", year_introduced: 2005 },
    { id: "2", name: "Cheer Bear", year_introduced: 1982 },
    { id: "1", name: "Tenderheart Bear", year_introduced: 1982 },
    { id: "3", name: "Wish Bear", year_introduced: 1982 },
  ]);
});

test.todo("performs a custom sort on property values");
// test.only("performs a custom sort on property values", async (t) => {
//   const result = await t.context.store.get({
//     type: "bears",
//     props: ["name", "year_introduced"],
//     order: [{ property: "name", direction: "asc", function: "nameLengthSorter" }],
//   });

//   t.deepEqual(result, [
//     { id: "3", name: "Wish Bear", year_introduced: 1982 },
//     { id: "2", name: "Cheer Bear", year_introduced: 1982 },
//     { id: "1", name: "Tenderheart Bear", year_introduced: 1982 },
//     { id: "5", name: "Smart Heart Bear", year_introduced: 2005 },
//   ]);
// });

test.todo("performs a custom sort on multiple property values");
// test("performs a custom sort on multiple property values", async (t) => {
//   const result = await t.context.store.get({
//     type: "bears",
//     props: ["name", "year_introduced"],
//     order: [{ direction: "asc", function: "nameLengthAndYearSorter" }],
//   });

//   t.deepEqual(result, [
//     { id: "5", name: "Smart Heart Bear", year_introduced: 2005 },
//     { id: "3", name: "Wish Bear", year_introduced: 1982 },
//     { id: "2", name: "Cheer Bear", year_introduced: 1982 },
//     { id: "1", name: "Tenderheart Bear", year_introduced: 1982 },
//   ]);
// });

test("searches on a field that is not a returned prop", async (t) => {
  const result = await t.context.store.get({
    type: "bears",
    props: ["year_introduced"],
    order: [{ property: "name", direction: "asc" }],
  });

  t.deepEqual(result, [
    { id: "2", year_introduced: 1982 },
    { id: "5", year_introduced: 2005 },
    { id: "1", year_introduced: 1982 },
    { id: "3", year_introduced: 1982 },
  ]);
});

test("orders nested fields", async (t) => {
  const result = await t.context.store.get({
    type: "powers",
    props: ["name"],
    order: [{ property: "name", direction: "desc" }],
    relationships: {
      bears: {
        order: [{ property: "name", direction: "asc" }],
      },
    },
  });

  t.deepEqual(result, [
    { id: "makeWish", name: "Make a Wish", bears: [] },
    {
      id: "careBearStare",
      name: "Care Bear Stare",
      bears: [{ id: "2" }, { id: "5" }, { id: "1" }, { id: "3" }],
    },
  ]);
});
