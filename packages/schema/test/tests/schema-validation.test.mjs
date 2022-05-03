import test from "ava";
import { setPath } from "@polygraph/utils";
import { ResourceSchema } from "../../src/resource-schema.mjs";
import { soccerResourceSchema } from "../fixtures/soccer-fixtures.mjs";

test("validates a correct resource schema", (t) => {
  t.notThrows(() => {
    ResourceSchema(soccerResourceSchema);
  });
});

test("validates a correct resource schema with extra properties", (t) => {
  const okay = setPath(
    soccerResourceSchema,
    ["today"],
    "monday",
  );

  t.notThrows(() => {
    ResourceSchema(okay);
  });
});

test("fails to validate a resource schema with an invalid resource in a relationship", (t) => {
  const bad = setPath(
    soccerResourceSchema,
    ["resources", "match", "properties", "homeTeam", "relatedType"],
    "bear",
  );

  t.throws(() => {
    ResourceSchema(bad);
  });
});

test("fails to validate a resource schema with an invalid inverse relationship in a relationship", (t) => {
  const bad = setPath(
    soccerResourceSchema,
    ["resources", "match", "properties", "homeTeam", "inverse"],
    "bear",
  );

  t.throws(() => {
    ResourceSchema(bad);
  });
});
