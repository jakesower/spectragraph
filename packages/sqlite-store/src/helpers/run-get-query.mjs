import { normalizeQuery } from "@polygraph/core/query";
import { pipe } from "@polygraph/utils";
import { keyBy, multiApply, partition } from "@polygraph/utils/arrays";
import { mapObj, pick } from "@polygraph/utils/objects";

const CLAUSE_KEYS = ["select", "join", "vars", "where"];

// note that `left` must define all clauses (even if empty)
const combineQueryClauses = (left, right) => {
  const out = {};
  CLAUSE_KEYS.forEach((key) => {
    out[key] = [...(left[key] ?? []), ...(right[key] ?? [])];
  });
  return out;
};

export function runGetQuery(schema, db, rootQuery) {
  const resultCache = {};

  function go(query, parentClauses) {
    console.log("---");
    const resDef = schema.resources[query.type];

    const relEntries = Object.entries(query.relationships);
    const [relEntriesToJoin, relEntriesToSubQuery] = partition(relEntries, () => false);
    const localSubQueryProps = relEntriesToSubQuery
      .map(([relName]) => resDef.properties[relName].store?.join?.localColumn)
      .filter(Boolean);

    const topSelect = [`${query.type}.id`, ...query.properties];
    const topClause = {
      select: topSelect,
      join: [],
      vars: [],
      where: [],
    };

    const relCols = Object.keys(query.relationships ?? {})
      .map((relName) => resDef.properties[relName].store.join.localColumn)
      .filter(Boolean);

    const joinColsClause = {
      select: relCols.map((col) => `${query.type}.${col}`),
    };

    const combinedClauses = [...parentClauses, topClause, joinColsClause].reduce(
      combineQueryClauses,
    );

    if (!resultCache[query.type]) resultCache[query.type] = {};

    const sql = `
      SELECT ${combinedClauses.select.join(", ")}
      FROM ${resDef.store.table}
      ${combinedClauses.join.join("\n")}
      ${
  combinedClauses.where.length > 0
    ? `WHERE ${combinedClauses.where.join("\nAND ")}`
    : ""
}
    `;
    console.log("sql", sql);
    console.log("vars", combinedClauses.vars);

    const statement = db.prepare(sql);
    const allResults = statement.all(combinedClauses.vars) ?? null;

    // these are keyed by {local cardinality, foreign cardinality}
    const resolvers = {
      one: {
        one(res, relDef, inverseResDef, inverseRelDef) {
          return "TODO";
        },
        many(ress, subQuery, relDef, inverseResDef) {
          const foreignTableName = inverseResDef.store.table;
          const { localColumn } = relDef.store.join;
          const placeHolders = Array(ress.length).fill("?").join(", ");
          const subTree = go(subQuery, [
            {
              where: [`${foreignTableName}.id IN (${placeHolders})`],
              vars: ress.map((res) => res[localColumn]),
            },
          ]);

          const lookup = keyBy(subTree, (relRes) => relRes.id);
          console.log({
            subTree,
            lookup,
            ress,
            localColumn,
            x: ress.map((res) => lookup[res[localColumn]]),
          });
          return Object.fromEntries(
            ress.map((res) => [res.id, lookup[res[localColumn]]]),
          );
        },
      },
      many: {
        one(res, relDef, inverseResDef, inverseRelDef) {
          // const foreignTableName = inverseResDef.store.table;
          // const { localColumn } = relDef.store.join;
          // return [
          //   {
          //     where: [`${foreignTableName}.id = ?`],
          //     vars: [res[localColumn]],
          //   },
          // ];
        },
        many(relDef, inverseResDef, inverseRelDef) {
          return "TODO";
        },
      },
    };

    const relLookups = mapObj(query.relationships, (subQuery, relName) => {
      // need to use the join IDs from above to provide the right ids to subqueries
      // also need to query from foreign keys to the current IDs
      // ultimately the cardinality pair dominates logic both here and in joins
      const relDef = resDef.properties[relName];
      const inverseResDef = schema.resources[relDef.relatedType];
      const inverseRelDef = inverseResDef.properties[relDef.inverse];
      const resolver = resolvers[relDef.cardinality][inverseRelDef.cardinality];

      return resolver(allResults, subQuery, relDef, inverseResDef, inverseRelDef);
    });

    const populatedResults = allResults.map((res) => ({
      id: res.id,
      ...pick(res, query.properties),
      ...mapObj(query.relationships, (_, relName) => relLookups[relName][res.id]),
    }));

    // console.log("rd", resDef);
    console.log("query", query);
    console.log("ar", allResults);
    console.log("rls", relLookups);
    console.log("poprs", populatedResults);
    console.log("---");
    return populatedResults;
  }

  const normalQuery = normalizeQuery(schema, rootQuery);

  if (normalQuery.id) {
    const results = go(normalQuery, [
      { where: [`${normalQuery.type}.id = ?`], vars: [normalQuery.id] },
    ]);

    return results.length === 0 ? null : results[0];
  }

  return go(normalQuery, []);
}

// join resolvers
// const resolvers = {
//   one: {
//     one(relDef, inverseResDef, inverseRelDef) {
//       return "TODO";
//     },
//     many(relDef, inverseResDef) {
//       const foreignTableName = inverseResDef.store.table;
//       const foreignTableAlias = [...path, foreignTableName].join("$");
//       const { localColumn } = relDef.store.join;
//       console.log({ relDef, inverseResDef });

//       return `JOIN ${foreignTableName} AS ${foreignTableAlias} ON ${localTableAlias}.${localColumn} = ${foreignTableAlias}.id`;
//     },
//   },
//   many: {
//     one(relDef, inverseResDef, inverseRelDef) {
//       const foreignTableName = inverseResDef.store.table;
//       const foreignTableAlias = [...path, foreignTableName].join("$");
//       const { localColumn: inverseJoinColumn } = inverseRelDef.store.join;
//       console.log("y", inverseRelDef);

//       return `JOIN ${foreignTableName} AS ${foreignTableAlias} ON ${foreignTableAlias}.${inverseJoinColumn} = ${localTableAlias}.id`;
//     },
//     many(relDef, inverseResDef, inverseRelDef) {
//       return "TODO";
//     },
//   },
// };
