export const schema = {
  title: "Care Bear Schema",
  urlName: "care-bears",
  resources: {
    bears: {
      singular: "bear",
      plural: "bears",
      properties: {
        name: { default: "", type: "string" },
        year_introduced: { type: "number" },
        belly_badge: { type: "string" },
        fur_color: { type: "string" },
      },
      relationships: {
        home: {
          relatedType: "homes",
          cardinality: "one",
          inverse: "bears",
        },
        powers: {
          relatedType: "powers",
          cardinality: "many",
          inverse: "bears",
        },
        best_friend: {
          relatedType: "bears",
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
        is_in_clouds: { type: "boolean" },
      },
      relationships: {
        bears: {
          relatedType: "bears",
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
        type: { type: "string" },
      },
      relationships: {
        bears: {
          relatedType: "bears",
          cardinality: "many",
          inverse: "powers",
        },
      },
    },

    companions: {
      singular: "companion",
      plural: "companions",
      properties: {
        name: { type: "string", optional: true },
        recurs: { type: "boolean", default: false },
      },
      relationships: {
        follows: {
          relatedType: "bears",
          cardinality: "many",
        },
      },
    },
  },
} as const;
