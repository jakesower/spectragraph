import anyTest, { TestInterface } from "ava";
import { makeMemoryStore, MemoryStore } from "../../src/memory-store";
import { DataTreeOfType, ExpandedSchema, Schema } from "../../src/types";
import { PolygraphError } from "../../src/validations/errors";
import { careBearData } from "../fixtures/care-bear-data";
import { schema } from "../fixtures/care-bear-schema";

type S = typeof schema;
const expandedSchema = schema as ExpandedSchema<S>;

const validations = [
  {
    name: "no self as best friend",
    resourceType: "bears",
    validateResource: (updatedResource) => {
      if (updatedResource.best_friend?.id === updatedResource.id) {
        throw new Error("a bear can't be best friends with themselves!");
      }
    },
  },
//   {
//   validate: (updatedTree) => {
//     if (!updatedTree.powers.some((power) => power.name === "Care Bear Stare")) {
//       return [{
//         validationName: "original bears have Care Bear Stare",
//         message: "original bears must have Care Bear Stare",
//         type: "bears",
//         id: "string",
//         validationType: "resource",
//       }];
//     }
//     return [];
//   },
// }
];

const test = anyTest as TestInterface<{ store: MemoryStore<S> }>;

test.beforeEach(async (t) => {
  // eslint-disable-next-line no-param-reassign
  t.context = {
    store: await makeMemoryStore(schema, {
      initialData: careBearData,
      validations,
    }),
  };
  console.log("\n\n\nmade store\n\n\n");
});

test("enforces no custom validaton (single resource - no self as best_friend)", async (t) => {
  const err = await t.throwsAsync(async () => {
    await t.context.store.replaceOne(
      {
        type: "bears",
        id: "2",
        relationships: { best_friend: {} },
      },
      { type: "bears", id: "2", best_friend: { id: "2" } },
    );
  });

  t.deepEqual(err.message, "a bear can't be best friends with themselves!");
});

test.todo("leaf references must exist");

// test("enforces a custom validaton (original bears must have care bear stare)", async (t) => {
//   const err = await t.throwsAsync(async () => {
//     await t.context.store.replaceOne(
//       {
//         type: "bears",
//         id: "2",
//         relationships: { powers: {} },
//       },
//       { type: "bears", id: "2", powers: [{ type: "powers", id: "2" }] },
//     );
//   });

//   t.deepEqual(err.message, "PG-0003");
// });

// test("does not validate empty objects", (t) => {
//   t.deepEqual(singleCompiled({}), false);
// });

// test("does not validate objects without a type", (t) => {
//   t.notDeepEqual(getErrors(singleCompiled, { tree: tenderheart.tree, isSingular: true }), []);
// });

// test("does not validate objects with an invalid type", (t) => {
//   t.notDeepEqual(getErrors(singleCompiled, { type: "chickens", tree: tenderheart.tree, isSingular: true }), []);
// });

// test("does not validate trees without an id", (t) => {
//   t.notDeepEqual(
//     getErrors(singleCompiled, { type: "bears", tree: careBearData.bears["1"].properties, isSingular: true }), [],
//   );
// });

// test("validates a tree from the sample data", (t) => {
//   t.deepEqual(getErrors(singleCompiled, tenderheart), []);
// });

// test("does not validate objects with a mismatched type", (t) => {
//   t.notDeepEqual(getErrors(singleCompiled, { type: "homes", tree: tenderheart.tree, isSingular: true }), []);
// });

// test("validates a tree with valid to-one nested data", (t) => {
//   const nestedTree = {
//     type: "bears",
//     tree: {
//       ...tenderheart.tree,
//       home: careALot.tree,
//     },
//     isSingular: true,
//   };
//   t.deepEqual(getErrors(singleCompiled, nestedTree), []);
// });

// test("validates a tree with valid to-one nested data (null)", (t) => {
//   const nestedTree = {
//     type: "bears",
//     tree: {
//       ...tenderheart.tree,
//       home: null,
//     },
//     isSingular: true,
//   };
//   t.deepEqual(getErrors(singleCompiled, nestedTree), []);
// });

// test("does not validate a tree with nested data of the wrong type", (t) => {
//   const nestedTree = {
//     type: "bears",
//     tree: {
//       ...tenderheart.tree,
//       home: tenderheart.tree,
//     },
//     isSingular: true,
//   };
//   t.notDeepEqual(getErrors(singleCompiled, nestedTree), []);
// });

// test("validates a tree with valid to-many nested data", (t) => {
//   const nestedTree = {
//     type: "homes",
//     tree: {
//       ...careALot.tree,
//       bears: [tenderheart.tree],
//     },
//     isSingular: true,
//   };
//   t.deepEqual(getErrors(singleCompiled, nestedTree), []);
// });

// test("validates a tree with valid to-many nested data (empty)", (t) => {
//   const nestedTree = {
//     type: "homes",
//     tree: {
//       ...careALot.tree,
//       bears: [],
//     },
//     isSingular: true,
//   };
//   t.deepEqual(getErrors(singleCompiled, nestedTree), []);
// });

// test("does not validate a tree with invalid to-many nested data", (t) => {
//   const nestedTree = {
//     type: "homes",
//     tree: {
//       ...careALot.tree,
//       bears: careALot.tree,
//     },
//     isSingular: true,
//   };
//   t.notDeepEqual(getErrors(singleCompiled, nestedTree), []);
// });

// test("does not validate a tree with invalid to-many nested data (null in array)", (t) => {
//   const nestedTree = {
//     type: "homes",
//     tree: {
//       ...careALot.tree,
//       bears: [null],
//     },
//     isSingular: true,
//   };
//   t.notDeepEqual(getErrors(singleCompiled, nestedTree), []);
// });

// test("does not validate a tree with invalid to-many (null)", (t) => {
//   const nestedTree = {
//     type: "homes",
//     tree: {
//       ...careALot.tree,
//       bears: null,
//     },
//     isSingular: true,
//   };
//   t.notDeepEqual(getErrors(singleCompiled, nestedTree), []);
// });

// test("does not validates a tree with invalid to-one nested data (array)", (t) => {
//   const nestedTree = {
//     type: "bears",
//     tree: {
//       ...tenderheart.tree,
//       home: [careALot.tree],
//     },
//     isSingular: true,
//   };
//   t.notDeepEqual(getErrors(singleCompiled, nestedTree), []);
// });

// test("validates a tree with valid deeply nested data", (t) => {
//   const nestedTree = {
//     type: "bears",
//     tree: {
//       ...tenderheart.tree,
//       home: {
//         ...careALot.tree,
//         bears: [tenderheart.tree],
//       },
//     },
//     isSingular: true,
//   };
//   t.deepEqual(getErrors(singleCompiled, nestedTree), []);
// });
