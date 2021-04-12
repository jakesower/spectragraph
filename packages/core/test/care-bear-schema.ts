import { Schema } from "../src/types";

export const schema: Schema = {
  title: "Care Bear Schema",
  resources: {
    bears: {
      singular: "bear",
      plural: "bears",
      attributes: {
        name: { type: "string" },
        gender: { type: "string" },
        belly_badge: { type: "string" },
        fur_color: { type: "string" },
        home: {
          type: "homes",
          cardinality: "one",
          inverse: "bears",
        },
        powers: {
          type: "powers",
          cardinality: "many",
          inverse: "bears",
        },
        best_friend: {
          type: "bears",
          cardinality: "one",
          inverse: "best_friend",
        },
      },
    },

    homes: {
      singular: "home",
      plural: "homes",
      attributes: {
        name: { type: "string" },
        location: { type: "string" },
        caring_meter: { type: "number" },
        bears: {
          type: "bears",
          cardinality: "many",
          inverse: "home",
        },
      },
    },

    powers: {
      singular: "power",
      plural: "powers",
      attributes: {
        name: { type: "string" },
        description: { type: "text" },
        bears: {
          type: "bears",
          cardinality: "many",
          inverse: "powers",
        },
      },
    },
  },
};
