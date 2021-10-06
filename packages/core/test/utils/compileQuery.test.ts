import test from "ava";
// import { mapObj } from "@polygraph/utils";
import { schema as rawSchema } from "../care-bear-schema";
import { compileSchema } from "../../src/data-structures/schema";
import { compileQuery } from "../../src/utils";
import {
  CompiledQuery, CompiledSchemaResource, CompiledSchemaResourceGeneric, Expand, Schema,
} from "../../src/types";

const schema = compileSchema(rawSchema);
type S = typeof schema;

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

const getRefOnlyRels = <ResType extends keyof S["resources"]>(
  resType: ResType,
) => {
  // const rels = schema.resources[resType].relationships as
  //   Record<keyof S["resources"][ResType]["relationships"], CompiledSchemaResourceGeneric<S>>;
  // type R = Expand<typeof rels>
  // type RK = keyof (typeof rels)
  // type RKE = keyof R;
  // const ks = Object.keys(rels) as RK[];

  const out = mapObj(
    schema.resources[resType].relationships,
    (relDef) => ({ referencesOnly: true, type: relDef.name }),
  );

  return out;
};

test("compiles a query for a single resource", async (t) => {
  const ro = getRefOnlyRels("bears");
  console.log(">>", ro);
  // return;

  // const result = await compileQuery<S, "bears">(schema, { type: "bears", id: "1" });
  // const expected: CompiledQuery<S, "bears"> = {
  //   type: "bears",
  //   id: "1",
  //   properties: schema.resources.bears.propertyNames,
  //   referencesOnly: false,
  //   relationships: {},
  // };

  // type R = Expand<typeof result>;
  // console.log(result);

  // t.deepEqual(result, expected);
});
