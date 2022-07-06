import { normalizeGetQuery, normalizeSetQuery } from "@polygraph/core/query";
import { get as getQuery } from "./helpers/get.mjs";
import { set as setQuery } from "./helpers/set.mjs";

export async function SQLiteStore(schema, db) {
  return {
    get: async (query) => {
      const normalQuery = normalizeGetQuery(schema, query);
      return getQuery(schema, db, normalQuery);
    },
    set: async (query, tree) => {
      const normalQuery = normalizeSetQuery(schema, query);
      return setQuery(schema, db, normalQuery, tree);
    },
  };
}
