import test from "ava";
// import { mapObj } from "@polygraph/utils";
import { mapObj } from "@polygraph/utils";
import { schema } from "../fixtures/care-bear-schema";
import { compileQuery } from "../../src/utils";
import { ExpandedSchema, Query } from "../../src/types";

type S = typeof schema;
type XS = ExpandedSchema<S>;
const expandedSchema = schema as XS;

const getRefOnlyRels = <ResType extends keyof S["resources"]>(
  resType: ResType,
) => {
  const out = mapObj(
    expandedSchema.resources[resType].relationships,
    (_, type) => (
      { referencesOnly: true, type } as const
    ),
  );

  return out;
};

const propertyNames = <ResType extends keyof S["resources"]>(resType: ResType) => (
  Object.keys(schema.resources[resType].properties) as (
    (keyof S["resources"][ResType]["properties"])[]
  )
);

test("compiles a query for a single resource", async (t) => {
  const rawQuery = { type: "bears", id: "1" };
  const query = rawQuery as Query<S, "bears">;
  const result = compileQuery(schema, query);

  const expected = {
    type: "bears",
    id: "1",
    properties: propertyNames("bears"),
    referencesOnly: false,
    relationships: getRefOnlyRels("bears"),
  } as const;

  t.deepEqual(result, expected);
});

test("compiles a query for a single resource with specified properties", async (t) => {
  const rawQuery = { type: "bears", id: "1", properties: ["name", "fur_color"] } as const;
  const result = compileQuery(schema, rawQuery);

  const expected = {
    type: "bears",
    id: "1",
    properties: ["name", "fur_color"],
    referencesOnly: false,
    relationships: getRefOnlyRels("bears"),
  } as typeof result;

  t.deepEqual(result, expected);
});
