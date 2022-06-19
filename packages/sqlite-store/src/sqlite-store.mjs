import { mapObj } from "@polygraph/utils";
import { normalizeQuery } from "@polygraph/core/query";
import { buildJoins } from "./helpers/relationship-helpers.mjs";
import { runGetQuery } from "./helpers/run-get-query.mjs";

const flattenRelationships = (query) => {
  const nested = Object.values(query.relationships ?? {}).flatMap(flattenRelationships);
  return [query, ...nested];
};

export async function SQLiteStore(schema, db) {
  const get = async (query) => {
    return runGetQuery(schema, db, query);
    const resDef = schema.resources[query.type];
    console.log(flattenRelationships(normalQuery));

    const topSelect = [`${query.type}.id`, ...normalQuery.properties];
    const relParts = buildJoins(schema, normalQuery);

    const topParts = {
      select: topSelect,
      join: [],
      vars: query.id ? [query.id] : [],
      where: query.id ? [`${query.type}.id = ?`] : [],
    };

    console.log("rps", relParts);
    console.log("rf", flattenRelationships(relParts));
    const combinedParts = relParts.reduce(
      (acc, relPart) => ({
        ...acc,
        ...mapObj(relPart, (val, key) => {
          console.log({ acc, relPart, val, key });
          return [...acc[key], val];
        }),
      }),
      topParts,
    );
    // console.log("cps", combinedParts);

    const sql = `
      SELECT ${combinedParts.select.join(", ")}
      FROM ${resDef.store.table}
      ${combinedParts.join.join("\n")}
      ${
  combinedParts.where.length > 0
    ? `WHERE ${combinedParts.where.join("\nAND ")}`
    : ""
}
    `;
    // console.log(sql);

    const method = query.id ? "get" : "all";

    const statement = await db.prepare(sql);
    const out = (await statement[method](combinedParts.vars)) ?? null;

    // console.log('out',  out);

    return out;
  };
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
