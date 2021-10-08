import test from "ava";
// import { mapObj } from "@polygraph/utils";
import { schema as rawSchema } from "../care-bear-schema";
import { compileSchema } from "../../src/data-structures/schema";
import { compileQuery } from "../../src/utils";
import {
  CompiledSchemaRelationshipGeneric,
} from "../../src/types";

const schema = compileSchema(rawSchema);
type S = typeof rawSchema;
type CS = typeof schema;

function mapObj<T, U>(
  obj: T,
  fn: (val: T[keyof T], key: keyof T) => U,
): Record<keyof T, U> {
  const k1 = Object.keys(obj);
  const keys = Object.keys(obj) as (keyof T)[];
  const output = {} as Record<keyof T, U>;
  const l = keys.length;

  for (let i = 0; i < l; i += 1) {
    const key = keys[i];
    const val = obj[key];
    output[keys[i]] = fn(val, key);
  }

  return output;
}

const getRefOnlyRels = <ResType extends keyof CS["resources"]>(
  resType: ResType,
) => {
  const out = mapObj(
    schema.resources[resType].relationships,
    (relDef: CompiledSchemaRelationshipGeneric<S, ResType, any>) => (
      { referencesOnly: true, type: relDef.name }
    ),
  );

  return out;
};

test("compiles a query for a single resource", async (t) => {
  const result = await compileQuery(schema, { type: "bears", id: "1" });
  const expected = {
    type: "bears",
    id: "1",
    properties: schema.resources.bears.propertyNames,
    referencesOnly: false,
    relationships: getRefOnlyRels("bears"),
  } as const;

  t.deepEqual(result, expected);
});
