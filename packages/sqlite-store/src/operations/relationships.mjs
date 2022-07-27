import { intersperse, last } from "@polygraph/utils/arrays";
import { getPath } from "@polygraph/utils/lenses";

function makeRelBuilders(schema) {
  return {
    one: {
      one({ outgoingResDef, outgoingQueryTableName, relName, incomingTableName }) {
        const outgoingRelDef = outgoingResDef.properties[relName];
        const outgoingJoinColumn = outgoingRelDef.store.join.localColumn;

        const incomingResDef = schema.resources[outgoingRelDef.relatedType];
        const incomingTable = incomingResDef.store.table;

        return [
          `LEFT JOIN ${incomingTable} AS ${incomingTableName} ON ${outgoingQueryTableName}.${outgoingJoinColumn} = ${incomingTableName}.id`,
        ];
      },
      many({ outgoingResDef, outgoingQueryTableName, relName, incomingTableName }) {
        const outgoingRelDef = outgoingResDef.properties[relName];

        const incomingResDef = schema.resources[outgoingRelDef.relatedType];
        const incomingTable = incomingResDef.store.table;
        const incomingRelDef = incomingResDef.properties[outgoingRelDef.inverse];
        const incomingJoinColumn = incomingRelDef.store.join.localColumn;

        return [
          `LEFT JOIN ${incomingTable} AS ${incomingTableName} ON ${outgoingQueryTableName}.id = ${incomingTableName}.${incomingJoinColumn}`,
        ];
      },
    },
    many: {
      one({ outgoingResDef, outgoingQueryTableName, relName, incomingTableName }) {
        const outgoingRelDef = outgoingResDef.properties[relName];
        const outgoingJoinColumn = outgoingRelDef.store.join.localColumn;

        const incomingResDef = schema.resources[outgoingRelDef.relatedType];
        const incomingTable = incomingResDef.store.table;

        return [
          `LEFT JOIN ${incomingTable} AS ${incomingTableName} ON ${outgoingQueryTableName}.${outgoingJoinColumn} = ${incomingTableName}.id`,
        ];
      },
      many({ outgoingResDef, outgoingQueryTableName, relName, incomingTableName }) {
        const outgoingRelDef = outgoingResDef.properties[relName];
        const outgoingJoinColumn = outgoingRelDef.store.join.joinColumn;

        const incomingResDef = schema.resources[outgoingRelDef.relatedType];
        const incomingTable = incomingResDef.store.table;
        const incomingRelDef = incomingResDef.properties[outgoingRelDef.inverse];
        const incomingJoinColumn = incomingRelDef.store.join.joinColumn;

        const { joinTable } = outgoingRelDef.store.join;
        const joinTableName = `${outgoingQueryTableName}$$${relName}`;

        return [
          `LEFT JOIN ${joinTable} AS ${joinTableName} ON ${outgoingQueryTableName}.id = ${joinTableName}.${outgoingJoinColumn}`,
          `LEFT JOIN ${incomingTable} AS ${incomingTableName} ON ${incomingTableName}.id = ${joinTableName}.${incomingJoinColumn}`,
        ];
      },
    },
    none: {
      // one({ outgoingResDef, outgoingTableName, relName, path }) {
      //   // TODO
      // },
      many({ outgoingResDef, outgoingQueryTableName, relName, incomingTableName }) {
        const outgoingRelDef = outgoingResDef.properties[relName];
        const outgoingJoinColumn = outgoingRelDef.store.join.joinColumn;

        const incomingResDef = schema.resources[outgoingRelDef.relatedType];
        const incomingTable = incomingResDef.store.table;
        const incomingRelDef = incomingResDef?.properties?.[outgoingRelDef.inverse];
        const incomingJoinColumn = incomingRelDef
          ? incomingRelDef.store.join.joinColumn
          : outgoingRelDef.store.join.foreignJoinColumn;

        const { joinTable } = outgoingRelDef.store.join;
        const joinTableName = `${outgoingQueryTableName}$$${relName}`;

        return [
          `LEFT JOIN ${joinTable} AS ${joinTableName} ON ${outgoingQueryTableName}.id = ${joinTableName}.${outgoingJoinColumn}`,
          `LEFT JOIN ${incomingTable} AS ${incomingTableName} ON ${incomingTableName}.id = ${joinTableName}.${incomingJoinColumn}`,
        ];
      },
    },
  };
}

export const preQueryRelationships = (query, queryPath, context) => {
  const { rootQuery, schema } = context;

  const parentPath = queryPath.slice(0, -1);
  const tablePath = [schema.resources[rootQuery.type].store.table, ...queryPath];
  const parentTablePath = [schema.resources[rootQuery.type].store.table, ...parentPath];
  const relName = last(queryPath);

  const incomingQueryTableName = tablePath.join("$");

  const select = ["id", ...query.properties].map(
    (col) => `${incomingQueryTableName}.${col}`,
  );

  if (queryPath.length === 0) return { select };

  const relBuilders = makeRelBuilders(schema);
  const outgoingQueryTableName = parentTablePath.join("$");

  const parentQuery = getPath(rootQuery, parentPath.flatMap((segment) => ["relationships", segment]));

  const outgoingResDef = schema.resources[parentQuery.type];
  const outgoingRelDef = outgoingResDef.properties[relName];

  const incomingResDef = schema.resources[outgoingRelDef.relatedType];
  const incomingRelDef = incomingResDef.properties[outgoingRelDef.inverse];
  const incomingTableName = tablePath.join("$");

  const outgoingResCardinality = outgoingRelDef.cardinality;
  const incomingResCardinality = incomingRelDef?.cardinality ?? "none";

  const builderArgs = {
    outgoingResDef,
    outgoingQueryTableName,
    relName,
    incomingTableName,
  };

  const join = relBuilders[incomingResCardinality][outgoingResCardinality](builderArgs);

  return { select, join };
};
