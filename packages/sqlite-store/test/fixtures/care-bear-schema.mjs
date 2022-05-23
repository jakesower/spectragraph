export const careBearSchema = {
  resources: {
    bears: {
      properties: {
        name: { default: "", type: "string", store: { sqlType: "VARCHAR" } },
        year_introduced: { type: "number", store: { sqlType: "INTEGER" } },
        belly_badge: { type: "string", store: { sqlType: "VARCHAR" } },
        fur_color: { type: "string", store: { sqlType: "VARCHAR" } },
        home: {
          type: "relationship",
          relatedType: "homes",
          cardinality: "one",
          inverse: "bears",
          store: { join: { localColumn: "home_id" } },
        },
        powers: {
          type: "relationship",
          relatedType: "powers",
          cardinality: "many",
          inverse: "bears",
          store: {
            join: {
              joinTable: "bears_powers",
              joinColumn: "bear_id",
            },
          },
        },
        best_friend: {
          type: "relationship",
          relatedType: "bears",
          cardinality: "one",
          inverse: "best_friend",
          store: {
            join: {
              localColumn: "home_id",
              foreignColumn: "home_id",
            },
          },
        },
      },
      store: { table: "bears" },
    },

    homes: {
      properties: {
        name: { type: "string", store: { sqlType: "VARCHAR" } },
        location: { type: "string", store: { sqlType: "VARCHAR" } },
        caring_meter: { type: "number", store: { sqlType: "REAL" } },
        is_in_clouds: { type: "boolean", store: { sqlType: "INTEGER" } },
        bears: {
          type: "relationship",
          relatedType: "bears",
          cardinality: "many",
          inverse: "home",
          store: { join: { foreignTable: "bears", foreignColumn: "home_id" } },
        },
      },
      store: { table: "homes" },
    },

    powers: {
      singular: "power",
      plural: "powers",
      properties: {
        name: { type: "string", store: { sqlType: "VARCHAR" } },
        description: { type: "string", store: { sqlType: "VARCHAR" } },
        type: { type: "string", store: { sqlType: "VARCHAR" } },
        bears: {
          type: "relationship",
          relatedType: "bears",
          cardinality: "many",
          inverse: "powers",
          store: {
            join: {
              joinTable: "bears_powers",
              joinColumn: "power_id",
            },
          },
        },
      },
      store: { table: "powers" },
    },

    companions: {
      singular: "companion",
      plural: "companions",
      properties: {
        name: { type: "string", optional: true, store: { sqlType: "VARCHAR" } },
        recurs: {
          type: "boolean",
          default: false,
          store: { sqlType: "INTEGER" },
        },
        follows: {
          type: "relationship",
          relatedType: "bears",
          cardinality: "many",
          store: {
            join: {
              joinTable: "bears_companions",
              joinColumn: "companion_id",
            },
          },
        },
      },
      store: { table: "companions" },
    },
  },
};
