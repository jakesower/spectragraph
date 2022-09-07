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
        home: {
          type: "relationship",
          relatedType: "homes",
          cardinality: "one",
          inverse: "bears",
        },
        powers: {
          type: "relationship",
          relatedType: "powers",
          cardinality: "many",
          inverse: "bears",
        },
        best_friend: {
          type: "relationship",
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
        bears: {
          type: "relationship",
          relatedType: "bears",
          cardinality: "many",
          inverse: "home",
        },
      },
    },

    powers: {
      singular: "power",
      plural: "powers",
      idField: "powerId",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        type: { type: "string" },
        bears: {
          type: "relationship",
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
        follows: {
          type: "relationship",
          relatedType: "bears",
          cardinality: "many",
        },
      },
    },
  },
};
