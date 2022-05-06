export async function SQLiteStore(schema, db, options = {}) {
  const get = (query) => query;
  // const get = (query) => {
  //   const { getQuerySyntax } = syntaxValidations;
  //   if (!getQuerySyntax(query)) {
  //     throw new PolygraphError(ERRORS.INVALID_GET_QUERY_SYNTAX, {
  //       query,
  //       schemaErrors: JSON.stringify(getQuerySyntax.errors, null, 2),
  //     });
  //   }

  //   const normalQuery = normalizeQuery(schema, query);
  //   const getFromStore = ({ type, id }) =>
  //     id ? store[type][id] ?? null : Object.values(store[type]);
  //   const out = runQuery(normalQuery, getFromStore, {
  //     orderingFunctions,
  //     schema,
  //     query: normalQuery,
  //     dereference,
  //   });

  //   return Promise.resolve(out);
  // };

  return {
    get,
    // set,
  };
}
