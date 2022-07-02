import { get as getQuery } from "./helpers/get.mjs";

export async function SQLiteStore(schema, db) {
  const get = async (query) => getQuery(schema, db, query);

  return {
    get,
    // set,
  };
}
