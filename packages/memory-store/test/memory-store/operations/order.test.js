import test from "ava";
import { schema } from "../../fixtures/care-bear-schema.js";
import { MemoryStore } from "../../../src/memory-store.js";
import { careBearData } from "../../fixtures/care-bear-data.js";

test.beforeEach((t) => {
  // eslint-disable-next-line no-param-reassign
  t.context = { store: MemoryStore(schema).seed(careBearData) };
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

// test("performs a custom sort on property values", async (t) => {
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
