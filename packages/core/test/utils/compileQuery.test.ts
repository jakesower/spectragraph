import test from "ava";
// import { mapObj } from "@polygraph/utils";
import { mapObj } from "@polygraph/utils";
import { schema } from "../care-bear-schema";
import { compileSchema } from "../../src/data-structures/schema";
import { compileQuery } from "../../src/utils";
import {
  Expand, ExpandedSchema, CompiledQuery, CompiledSubQuery, Query, SubQuery,
} from "../../src/types";

// const schema = compileSchema(rawSchema);
// type S = typeof rawSchema;
// type SR = typeof rawSchema.resources.bears.relationships
type S = typeof schema;
type XS = ExpandedSchema<S>;
const expandedSchema = schema as XS;
type SchemaRelationships<ResType extends keyof S["resources"]> = XS["resources"][ResType]["relationships"];

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
  Object.keys(schema.resources[resType].properties) as (keyof S["resources"][ResType]["properties"])[]
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
