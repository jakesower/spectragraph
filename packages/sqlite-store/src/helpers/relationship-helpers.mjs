import { filterObj, mapObj, partition } from "@polygraph/utils";

/*
 * These are different approaches for fetching related data. They can be combined, but
 * it's still unclear which should be chosen under which circmustances.
 *
 * Ideas so far:
 *
 * - 1->1 join
 * - 1->X gather and query
 * - X->1 join
 * - X->X ???
 */
export function buildJoins(schema, query) {
  const go = (subQuery, path) => {
    const resDef = schema.resources[subQuery.type];
    const localTableAlias = path.join("$");

    const joinBuilders = {
      one: {
        one(relDef, inverseResDef, inverseRelDef) {
          return "TODO";
        },
        many(relDef, inverseResDef) {
          const foreignTableName = inverseResDef.store.table;
          const foreignTableAlias = [...path, foreignTableName].join("$");
          const { localColumn } = relDef.store.join;
          console.log({ relDef, inverseResDef });

          return `JOIN ${foreignTableName} AS ${foreignTableAlias} ON ${localTableAlias}.${localColumn} = ${foreignTableAlias}.id`;
        },
      },
      many: {
        one(relDef, inverseResDef, inverseRelDef) {
          const foreignTableName = inverseResDef.store.table;
          const foreignTableAlias = [...path, foreignTableName].join("$");
          const { localColumn: inverseJoinColumn } = inverseRelDef.store.join;
          console.log("y", inverseRelDef);

          return `JOIN ${foreignTableName} AS ${foreignTableAlias} ON ${foreignTableAlias}.${inverseJoinColumn} = ${localTableAlias}.id`;
        },
        many(relDef, inverseResDef, inverseRelDef) {
          return "TODO";
        },
      },
    };

    return Object.entries(subQuery.relationships).flatMap(([relType, relQuery]) => {
      const relDef = resDef.properties[relType];
      const inverseResDef = schema.resources[relDef.relatedType];
      const inverseRelDef = inverseResDef.properties[relDef.inverse];
      const foreignTableName = inverseResDef.store.table;
      const foreignTableAlias = [...path, foreignTableName].join("$");
      const joinBuilder = joinBuilders[relDef.cardinality][inverseRelDef.cardinality];
      // console.log({ relDef, inverseResDef })
      const join = joinBuilder(relDef, inverseResDef, inverseRelDef);
      const select = `${foreignTableAlias}.id as ${foreignTableAlias}$$id`;

      return { join, select };
    });
  };

  const joins = go(query, [query.type]);
  console.log(joins);

  return joins;
}

async function getByIds(schema, query, db, ids) {
  const resDef = schema.resources[query.type];

  const relEntries = Object.entries(query.relationships);
  const [relEntriesToJoin, relEntriesToSubQuery] = partition(relEntries, () => false);
  const localSubQueryProps = relEntriesToSubQuery
    .map(([, relDef]) => relDef.localColumn)
    .filter(Boolean);

  console.log(localSubQueryProps)
  const topSelect = [`${query.type}.id`, ...query.properties];
  const topParts = {
    select: topSelect,
    join: [],
    vars: [ids],
    where: [`${query.type}.id = IN (?)`],
  };
  const combinedParts = topParts;

  const sql = `
    SELECT ${combinedParts.select.join(", ")}
    FROM ${resDef.store.table}
    ${combinedParts.join.join("\n")}
    ${combinedParts.where.length > 0 ? `WHERE ${combinedParts.where.join("\nAND ")}` : ""}
  `;
  console.log(sql);

  const method = query.id ? "get" : "all";

  const statement = await db.prepare(sql);
  const out = (await statement[method](combinedParts.vars)) ?? null;

  const gatherers = {
    one: {
      one(relDef, inverseResDef, inverseRelDef) {
        return "TODO";
      },
      many(relDef, inverseResDef) {
        const foreignTableName = inverseResDef.store.table;
        const foreignTableAlias = [...path, foreignTableName].join("$");
        const { localColumn } = relDef.store.join;
        console.log({ relDef, inverseResDef });

        return `JOIN ${foreignTableName} AS ${foreignTableAlias} ON ${localTableAlias}.${localColumn} = ${foreignTableAlias}.id`;
      },
    },
    many: {
      one(relDef, inverseResDef, inverseRelDef) {
        const foreignTableName = inverseResDef.store.table;
        const foreignTableAlias = [...path, foreignTableName].join("$");
        const { localColumn: inverseJoinColumn } = inverseRelDef.store.join;
        console.log("y", inverseRelDef);

        return `JOIN ${foreignTableName} AS ${foreignTableAlias} ON ${foreignTableAlias}.${inverseJoinColumn} = ${localTableAlias}.id`;
      },
      many(relDef, inverseResDef, inverseRelDef) {
        return "TODO";
      },
    },
  };

  Object.entries(query.relationships).map(([relName, relDef]) => {
    // need to use the join IDs from above to provide the right ids to subqueries
    // also need to query from foreign keys to the current IDs
    // ultimately the cardinality pair dominates logic both here and in joins
  });

  console.log("out", out);

  return out;
}

export function gatherAndQuery(schema, query) {
  const go = (subQuery, path) => {
    const resDef = schema.resources[subQuery.type];
    const localTableAlias = path.join("$");

    const joinBuilders = {
      one: {
        one(relDef, inverseResDef, inverseRelDef) {
          return "TODO";
        },
        many(relDef, inverseResDef) {
          const foreignTableName = inverseResDef.store.table;
          const foreignTableAlias = [...path, foreignTableName].join("$");
          const { localColumn } = relDef.store.join;
          console.log({ relDef, inverseResDef });

          return `JOIN ${foreignTableName} AS ${foreignTableAlias} ON ${localTableAlias}.${localColumn} = ${foreignTableAlias}.id`;
        },
      },
      many: {
        one(relDef, inverseResDef, inverseRelDef) {
          const foreignTableName = inverseResDef.store.table;
          const foreignTableAlias = [...path, foreignTableName].join("$");
          const { localColumn: inverseJoinColumn } = inverseRelDef.store.join;
          console.log("y", inverseRelDef);

          return `JOIN ${foreignTableName} AS ${foreignTableAlias} ON ${foreignTableAlias}.${inverseJoinColumn} = ${localTableAlias}.id`;
        },
        many(relDef, inverseResDef, inverseRelDef) {
          return "TODO";
        },
      },
    };

    return Object.entries(subQuery.relationships).flatMap(([relType, relQuery]) => {
      const relDef = resDef.properties[relType];
      const inverseResDef = schema.resources[relDef.relatedType];
      const inverseRelDef = inverseResDef.properties[relDef.inverse];
      const foreignTableName = inverseResDef.store.table;
      const foreignTableAlias = [...path, foreignTableName].join("$");
      const joinBuilder = joinBuilders[relDef.cardinality][inverseRelDef.cardinality];
      // console.log({ relDef, inverseResDef })
      const join = joinBuilder(relDef, inverseResDef, inverseRelDef);
      const select = `${foreignTableAlias}.id as ${foreignTableAlias}$$id`;

      return { join, select };
    });
  };

  const joins = go(query, [query.type]);
  console.log(joins);

  return joins;
}
