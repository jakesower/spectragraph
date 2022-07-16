function makeRelBuilders(schema) {
  return {
    one: {
      one({ localResDef, localTableName, relName, path }) {
        const localRelDef = localResDef.properties[relName];
        const localJoinColumn = localRelDef.store.join.localColumn;

        const foreignResDef = schema.resources[localRelDef.relatedType];
        const foreignTable = foreignResDef.store.table;
        const foreignTableName = [...path, relName].join("$");

        return [
          `LEFT JOIN ${foreignTable} AS ${foreignTableName} ON ${localTableName}.${localJoinColumn} = ${foreignTableName}.id`,
        ];
      },
      many({ localResDef, localTableName, relName, path }) {
        const localRelDef = localResDef.properties[relName];

        const foreignResDef = schema.resources[localRelDef.relatedType];
        const foreignTable = foreignResDef.store.table;
        const foreignTableName = [...path, relName].join("$");
        const foreignRelDef = foreignResDef.properties[localRelDef.inverse];
        const foreignJoinColumn = foreignRelDef.store.join.localColumn;

        return [
          `LEFT JOIN ${foreignTable} AS ${foreignTableName} ON ${localTableName}.id = ${foreignTableName}.${foreignJoinColumn}`,
        ];
      },
    },
    many: {
      one({ localResDef, localTableName, relName, path }) {
        const localRelDef = localResDef.properties[relName];
        const localJoinColumn = localRelDef.store.join.localColumn;

        const foreignResDef = schema.resources[localRelDef.relatedType];
        const foreignTable = foreignResDef.store.table;
        const foreignTableName = [...path, relName].join("$");

        return [
          `LEFT JOIN ${foreignTable} AS ${foreignTableName} ON ${localTableName}.${localJoinColumn} = ${foreignTableName}.id`,
        ];
      },
      many({ localResDef, localTableName, relName, path }) {
        const localRelDef = localResDef.properties[relName];
        const localJoinColumn = localRelDef.store.join.joinColumn;

        const foreignResDef = schema.resources[localRelDef.relatedType];
        const foreignTable = foreignResDef.store.table;
        const foreignTableName = [...path, relName].join("$");
        const foreignRelDef = foreignResDef.properties[localRelDef.inverse];
        const foreignJoinColumn = foreignRelDef.store.join.joinColumn;

        const { joinTable } = localRelDef.store.join;
        const joinTableName = `${localTableName}$$${relName}`;

        return [
          `LEFT JOIN ${joinTable} AS ${joinTableName} ON ${localTableName}.id = ${joinTableName}.${localJoinColumn}`,
          `LEFT JOIN ${foreignTable} AS ${foreignTableName} ON ${foreignTableName}.id = ${joinTableName}.${foreignJoinColumn}`,
        ];
      },
    },
    none: {
      one({ localResDef, localTableName, relName, path }) {
        // TODO
      },
      many({ localResDef, localTableName, relName, path }) {
        const localRelDef = localResDef.properties[relName];
        const localJoinColumn = localRelDef.store.join.joinColumn;

        const foreignResDef = schema.resources[localRelDef.relatedType];
        const foreignTable = foreignResDef.store.table;
        const foreignTableName = [...path, relName].join("$");
        const foreignRelDef = foreignResDef?.properties?.[localRelDef.inverse];
        const foreignJoinColumn = foreignRelDef
          ? foreignRelDef.store.join.joinColumn
          : localRelDef.store.join.foreignJoinColumn;

        const { joinTable } = localRelDef.store.join;
        const joinTableName = `${localTableName}$$${relName}`;

        return [
          `LEFT JOIN ${joinTable} AS ${joinTableName} ON ${localTableName}.id = ${joinTableName}.${localJoinColumn}`,
          `LEFT JOIN ${foreignTable} AS ${foreignTableName} ON ${foreignTableName}.id = ${joinTableName}.${foreignJoinColumn}`,
        ];
      },
    },
  };
}

export function joinClauses(schema, rootQuery) {
  const relBuilders = makeRelBuilders(schema);

  const go = (query, path) => {
    const localResDef = schema.resources[query.type];
    const localTableName = path.join("$");

    return Object.entries(query.relationships).flatMap(([relName, subQuery]) => {
      const localRelDef = localResDef.properties[relName];

      const foreignResDef = schema.resources[localRelDef.relatedType];
      const foreignRelDef = foreignResDef.properties[localRelDef.inverse];

      const localResCardinality = localRelDef.cardinality;
      const foreignResCardinality = foreignRelDef?.cardinality ?? "none";

      const builderArgs = { localResDef, localTableName, relName, path };
      const joinSqls =
        relBuilders[foreignResCardinality][localResCardinality](builderArgs);

      return [...joinSqls, ...go(subQuery, [...path, relName])];
    });
  };

  const rootTable = schema.resources[rootQuery.type].store.table;
  return go(rootQuery, [rootTable]);
}

export function columnsToSelect(schema, rootQuery) {
  const go = (query, path) => {
    const localTableName = path.join("$");
    const curColumns = ["id", ...query.properties].map(
      (col) => `${localTableName}.${col}`,
    );

    const subColumns = Object.entries(query.relationships).flatMap(
      ([relName, subQuery]) => go(subQuery, [...path, relName]),
    );

    return [...curColumns, ...subColumns];
  };

  const rootTable = schema.resources[rootQuery.type].store.table;
  return go(rootQuery, [rootTable]);
}
