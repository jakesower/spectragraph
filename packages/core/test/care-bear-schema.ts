export const schema = {
  title: "Care Bear Schema",
  resources: {
    bears: {
      singular: "bear",
      plural: "bears",
      properties: {
        name: { type: "string" },
        gender: { type: "string" },
        belly_badge: { type: "string" },
        fur_color: { type: "string" },
      },
      relationships: {
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
      properties: {
        name: { type: "string" },
        location: { type: "string" },
        caring_meter: { type: "number" },
      },
      relationships: {
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
      properties: {
        name: { type: "string" },
        description: { type: "string" },
      },
      relationships: {
        bears: {
          type: "bears",
          cardinality: "many",
          inverse: "powers",
        },
      },
    },
  },
};
