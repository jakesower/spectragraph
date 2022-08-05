import { normalizeGetQuery, normalizeSetQuery } from "@blossom/core/query";
import { defaultStoreOptions } from "@blossom/core/store";
import { get as getQuery } from "./helpers/get.mjs";
import { set as setQuery } from "./helpers/set.mjs";
import { sqliteConstraintOperators } from "./operations/constraint-operators.mjs";

export async function SQLiteStore(schema, db, userConfig = {}) {
  const fullStoreConfig = {
    ...defaultStoreOptions,
    expressionDefinitions: {
      ...defaultStoreOptions.expressionDefinitions,
      ...sqliteConstraintOperators,
      ...(userConfig.expressionDefinitions ?? {}),
    },
    ...userConfig,
  };

  return {
    get: async (query) => {
      const normalQuery = normalizeGetQuery(schema, query);
      return getQuery(normalQuery, {
        config: fullStoreConfig,
        db,
        schema,
        query: normalQuery,
      });
    },
    set: async (query, tree) => {
      const normalQuery = normalizeSetQuery(schema, query);
      return setQuery(normalQuery, { config: fullStoreConfig, db, schema, query, tree });
    },
  };
}
