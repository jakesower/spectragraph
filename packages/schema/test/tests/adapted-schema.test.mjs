import test from "ava";
import { EACH, overEachPath } from "@polygraph/utils/lenses";
import {
  soccerResourceData,
  soccerResourceSchema,
} from "../fixtures/soccer-fixtures.mjs";
import { MappedSchema } from "../../src/mapped-schema.mjs";
import { ERRORS } from "../../src/strings.mjs";

const { arizonaBay } = soccerResourceData.team;

const functionDefinitions = {
  matchWinner: (match) =>
    match.homeGoals > match.awayGoals
      ? "home"
      : match.awayGoals > match.homeGoals
        ? "away"
        : "draw",
};

test("wipes a schema when nothing is specified", (t) => {
  const mapped = MappedSchema(soccerResourceSchema, {});
  t.deepEqual(
    mapped.schema,
    overEachPath(soccerResourceSchema, ["resources", EACH, "properties"], () => ({})),
  );
});

// $translate

test("translates a field", (t) => {
  const { schema, mapResource } = MappedSchema(soccerResourceSchema, {
    team: {
      moniker: { $translate: "name" },
    },
  });

  t.deepEqual(Object.keys(schema.resources.team.properties), ["moniker"]);

  const nextRes = mapResource("team", arizonaBay);

  t.deepEqual(nextRes, {
    moniker: "Arizona Bay FC",
  });
});

test("translates multiple fields even when names overlap", (t) => {
  const mapped = MappedSchema(soccerResourceSchema, {
    team: {
      homeMatches: { $translate: "awayMatches" },
      awayMatches: { $translate: "homeMatches" },
    },
  });

  t.deepEqual(mapped.schema.resources.team.properties, {
    awayMatches: soccerResourceSchema.resources.team.properties.homeMatches,
    homeMatches: soccerResourceSchema.resources.team.properties.awayMatches,
  });

  const nextRes = mapped.mapResource("team", arizonaBay);

  t.deepEqual(nextRes, {
    awayMatches: arizonaBay.homeMatches,
    homeMatches: arizonaBay.awayMatches,
  });
});

// $derive

test("handles a derived field", (t) => {
  const mapped = MappedSchema(
    soccerResourceSchema,
    {
      match: {
        winner: {
          $derive: {
            functionName: "matchWinner",
            propertyDefinition: {
              type: "string",
              enum: ["home", "away", "draw"],
            },
          },
        },
      },
    },
    { functionDefinitions },
  );

  t.deepEqual(mapped.schema.resources.match.properties.winner, {
    type: "string",
    enum: ["home", "away", "draw"],
  });

  const derived = mapped.mapResource("match", soccerResourceData.match[1]);

  t.deepEqual(derived, { winner: "draw" });
});

test("derived fields require a functionName", (t) => {
  t.throws(() => {
    MappedSchema(soccerResourceSchema, {
      match: {
        winner: {
          $derive: {
            type: "string",
            enum: ["home", "away", "draw"],
          },
        },
      },
    });
  });
});

test("derived fields require a valid functionName", (t) => {
  const err = t.throws(() => {
    MappedSchema(soccerResourceSchema, {
      match: {
        winner: {
          $derive: {
            functionName: "beep boop $_@",
            propertyDefinition: {
              type: "string",
              enum: ["home", "away", "draw"],
            },
          },
        },
      },
    });
  });

  t.deepEqual(err.message, ERRORS.FUNCTION_NOT_DEFINED);
});
