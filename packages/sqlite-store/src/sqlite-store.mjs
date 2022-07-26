import { normalizeGetQuery, normalizeSetQuery } from "@polygraph/core/query";
import { defaultStoreOptions } from "@polygraph/core/store";
import { get as getQuery } from "./helpers/get.mjs";
import { set as setQuery } from "./helpers/set.mjs";
import { sqliteConstraintExpressions } from "./operations/expressions.mjs";

export async function SQLiteStore(schema, db, userConfig = {}) {
  const fullStoreConfig = {
    ...defaultStoreOptions,
    expressionDefinitions: {
      ...defaultStoreOptions.expressionDefinitions,
      ...sqliteConstraintExpressions,
      ...(userConfig.expressionDefinitions ?? {}),
    },
    ...userConfig,
  };

  return {
    get: async (query) => {
      const normalQuery = normalizeGetQuery(schema, query);
      return getQuery(normalQuery, { config: fullStoreConfig, db, schema, query });
    },
    set: async (query, tree) => {
      const normalQuery = normalizeSetQuery(schema, query);
      return setQuery(normalQuery, { config: fullStoreConfig, db, schema, query, tree });
    },
  };
}
