import { buildResourceTable } from "@taxonic/core/resource-table";
import { normalizeGetQuery } from "@taxonic/core/query";
import { normalizeResource } from "@taxonic/core/resource";
import { getRelationshipProperties } from "@taxonic/core/schema";
import { normalizeTree } from "@taxonic/core/tree";
import { ensureCreatedResourceFields } from "@taxonic/core/validation";
import { asArray, differenceBy, groupBy, transpose, uniq } from "@taxonic/utils/arrays";
import { pipeThru } from "@taxonic/utils/functions";
import { filterObj, mapObj } from "@taxonic/utils/objects";
import { get } from "./get.js";

export async function set(rootQuery, context) {
  const { db, schema, tree: rootTreeOrTrees } = context;

  const castPropToDb = (resType, propKey, val) =>
    schema.resources[resType].properties[propKey].type === "boolean"
      ? val === true
        ? 1
        : val === false
          ? 0
          : undefined
      : val;

  const rootTrees = normalizeTree(rootQuery, rootTreeOrTrees);
  const resourceTable = await buildResourceTable(schema, async ({ setResource }) => {
    const go = async (tree) => {
      const getQuery = normalizeGetQuery(schema, {
        type: tree.type,
        id: tree.id,
        allProps: true,
        relationships: mapObj(tree.relationships, () => ({})),
      });

      // TODO: make this even resemble performant
      const existing = await get(getQuery, { ...context, query: getQuery });
      setResource(tree, existing);
      await Promise.all(
        Object.values(tree.relationships).map(async (treeRels) => treeRels.forEach(go)),
      );
    };

    const rootQueryWithAllRels = {
      ...rootQuery,
      relationships: mapObj(
        getRelationshipProperties(schema, rootQuery.type),
        () => ({}),
      ),
    };

    const rootExistingQuery = normalizeGetQuery(schema, rootQueryWithAllRels);
    const rootExisting = asArray(
      await get(rootExistingQuery, { ...context, query: rootExistingQuery }),
    );

    const absent = differenceBy(rootExisting, rootTrees, (res) => res.id);

    await Promise.all(rootTrees.map(go));
    absent.forEach((absentRes) => {
      setResource(null, normalizeResource(schema, rootQuery.type, absentRes));
    });
  });

  const resources = Object.values(resourceTable).flatMap((t) => Object.values(t));
  const byStatus = groupBy(resources, (res) => res.status);

  (byStatus.inserted ?? []).forEach((res) => {
    ensureCreatedResourceFields(schema, res);

    const resDef = schema.resources[res.type];

    const defaultProps = pipeThru(schema.resources[res.type].properties, [
      (props) => filterObj(props, (prop) => "default" in prop),
      (props) => mapObj(props, (prop) => prop.default),
    ]);

    const propCols = uniq([...Object.keys(defaultProps), ...Object.keys(res.properties)]);
    const propsWithDefaults = { ...defaultProps, ...res.properties };
    const propVals = propCols.map((prop) =>
      castPropToDb(res.type, prop, propsWithDefaults[prop]),
    );

    const relColPairs = Object.entries(res.relationships).flatMap(([relKey, relVal]) => {
      const { localColumn } = resDef.properties[relKey].store.join;
      return localColumn ? [[localColumn, [...relVal.added][0] ?? null]] : [];
    });
    const [relCols, relVals] = relColPairs.length > 0 ? transpose(relColPairs) : [[], []];

    const allCols = [...propCols, ...relCols];
    const allVals = [...propVals, ...relVals];

    const insertNodeQuery = db.prepare(
      `INSERT INTO ${resDef.store.table} (${[...allCols, "id"].join(", ")}) VALUES (${[
        ...allCols,
        ["id"],
      ]
        .map(() => "?")
        .join(", ")})`,
    );

    insertNodeQuery.run([...allVals, res.id]);
  });

  (byStatus.updated ?? []).forEach((res) => {
    const resDef = schema.resources[res.type];

    const propCols = Object.keys(res.properties);
    const propVals = propCols.map((prop) => res.properties[prop]);

    const relColPairs = Object.entries(res.relationships).flatMap(([relKey, relVal]) => {
      const { localColumn } = resDef.properties[relKey].store.join;
      return localColumn ? [[localColumn, [...relVal.added][0] ?? null]] : [];
    });
    const [relCols, relVals] = relColPairs.length > 0 ? transpose(relColPairs) : [[], []];

    const allCols = [...propCols, ...relCols];
    const allVals = [...propVals, ...relVals];

    if (allCols.length === 0) return;

    const updateNodeQuery = db.prepare(
      `UPDATE ${resDef.store.table} SET ${allCols
        .map((col) => `${col} = ?`)
        .join(", ")} WHERE id = ?`,
    );

    updateNodeQuery.run([...allVals, res.id]);
  });

  (byStatus.deleted ?? []).forEach((res) => {
    const resDef = schema.resources[res.type];
    const updateNodeQuery = db.prepare(`DELETE FROM ${resDef.store.table} WHERE id = ?`);

    updateNodeQuery.run([res.id]);
  });

  const joinTableCache = {};
  resources.forEach((res) => {
    const { type, id } = res;

    Object.entries(res.relationships).forEach(([relKey, relVal]) => {
      const relDef = schema.resources[type].properties[relKey];
      const { joinColumn, joinTable } = relDef.store.join;

      if (!joinTable) return;
      if (!(joinTable in joinTableCache)) {
        const { inverse, relatedType } = relDef;
        const foreignJoinColumn =
          relDef.store.join.foreignJoinColumn ??
          schema.resources[relatedType].properties[inverse].store.join.joinColumn;

        const insertStatement = db.prepare(
          `INSERT INTO ${joinTable} (${joinColumn}, ${foreignJoinColumn}) VALUES (?, ?)`,
        );
        const deleteStatement = db.prepare(
          `DELETE FROM ${joinTable} WHERE ${joinColumn} = ? AND ${foreignJoinColumn} = ?`,
        );

        joinTableCache[joinTable] = {
          type,
          relKey,
          insertStatement,
          deleteStatement,
        };
      } else if (
        joinTableCache[joinTable].type !== type ||
        joinTableCache[joinTable].relKey !== relKey
      ) {
        return;
      }

      const { insertStatement, deleteStatement } = joinTableCache[joinTable];

      // will create dups
      [...relVal.added].forEach((relId) => {
        insertStatement.run([id, relId]);
      });

      [...relVal.removed].forEach((relId) => {
        deleteStatement.run([id, relId]);
      });
    });
  });
}
