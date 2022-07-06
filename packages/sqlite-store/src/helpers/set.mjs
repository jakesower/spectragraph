import { ensureCreatedResourceFields } from "@polygraph/core/validation";
import { defaultResource } from "@polygraph/core/resource";
import { asArray, groupBy, keyBy, uniq } from "@polygraph/utils/arrays";
import { deepEqual } from "@polygraph/utils/generics";
import { omit } from "@polygraph/utils/objects";
import { combinationsBy } from "@polygraph/utils/sets";
import { get } from "./get.mjs";

export function set(schema, db, rootQuery, rootTree) {
  const queriesRun = [];

  const go = (query, treeArray) => {
    const resType = query.type;
    const resDef = schema.resources[resType];

    const castPropToDb = (propKey, val) =>
      resDef.properties[propKey].type === "boolean"
        ? val === true
          ? 1
          : val === false
            ? 0
            : undefined
        : val;

    const createAlterationQueries = (existing, updated) => {
      const existingById = keyBy(existing, (res) => res.id);
      const updatedById = keyBy(updated, (res) => res.id);
      const combos = combinationsBy(
        Object.keys(existingById),
        Object.keys(updatedById),
        (x) => x,
      );

      // console.log("q2", query);
      // console.log({ existing, updated });
      console.log(combos);

      const {
        leftOnly: toUnlink,
        rightOnly: toCreate,
        intersection: toPossiblyUpdate,
      } = combos;

      const cols = groupBy(Object.entries(resDef.properties), ([, propDef]) => {
        if (propDef.type !== "relationship") return "tableCols";
        if (propDef.store?.join?.localColumn) return "localJoinCols";

        // TODO: allow for one-way to-many relationships
        if (propDef?.store?.join?.joinColumn && resType <= propDef.relatedType) {
          return "joinCols";
        }
        return "unneeded";
      });

      const { joinCols = [], localJoinCols = [], tableCols = [] } = cols;

      const tableColNames = tableCols.map(([colName]) => colName);
      const tableLocalJoinColNames = localJoinCols.map(([colName]) => colName);

      const dataCols = Array(
        ["id", ...tableColNames, ...tableLocalJoinColNames].length,
      ).fill("?");

      const dataQuery = db.prepare(
        `INSERT INTO ${resType} VALUES (${dataCols.join(", ")})`,
      );

      const inserts = toCreate.flatMap((id) => {
        ensureCreatedResourceFields(schema, query, updatedById[id]);

        const res = {
          ...defaultResource(schema, resType),
          ...updatedById[id],
          id,
        };
        const tableData = tableColNames.map((colName) =>
          castPropToDb(colName, res[colName]),
        );
        const localJoinData = tableLocalJoinColNames.map(
          (colName) => res[colName]?.id ?? null,
        );

        const data = [id, ...tableData, ...localJoinData];
        dataQuery.run(data);
        queriesRun.push({ sql: dataQuery.source, vars: data });

        // console.log("res", res);
        // console.log("tcn", tableColNames);
        // console.log("dq", dataQuery);
        // console.log("data", data);

        return res;
      });

      if (toPossiblyUpdate.length > 0 && query.properties.length > 0) {
        const colsUpdateSql = query.properties.map((prop) => `${prop} = ?`);
        const statement = db.prepare(
          `UPDATE ${resDef.store.table} SET ${colsUpdateSql.join(", ")} WHERE id = ?`,
        );

        toPossiblyUpdate.forEach((id) => {
          const updatedRes = updatedById[id];
          const existingRes = existingById[id];
          const havePropsChanged = query.properties.some(
            (propKey) => !deepEqual(existingRes[propKey], updatedRes[propKey]),
          );

          if (havePropsChanged) {
            const vars = [
              ...query.properties.map((prop) =>
                castPropToDb(prop, updatedRes[prop] ?? existingRes[prop]),
              ),
              id,
            ];

            queriesRun.push({ sql: statement.source, vars });
            statement.run(vars);
          }
        });
      }

      return keyBy(inserts, (res) => res.id);
    };

    const { table } = resDef.store;
    const resIds = uniq(treeArray.map((t) => t.id));
    const existing =
      get(
        schema,
        db,
        { ...omit(query, ["allProps", "id"]), allProperties: true },
        [
          {
            where: [`${table}.id IN (${resIds.map(() => "?").join(", ")})`],
            vars: resIds,
          },
        ],
        { shallowRelationships: true },
      ) ?? [];

    const existingById = keyBy(existing, (r) => r.id);
    const updatedById = keyBy(treeArray, (r) => r.id);

    createAlterationQueries(existing, treeArray);

    Object.entries(query.relationships).forEach(([relKey, relQuery]) => {
      const relCombos = combinations(existing, updated, (res) => res.id);
      const { leftOnly: relsToRemove, rightOnly: relsToAdd } = relCombos;

      const relatedTrees = treeArray.flatMap((res) => asArray(res[relKey] ?? []));
      console.log("rts", relatedTrees);

      go(relQuery, relatedTrees);
    });
  };

  go(rootQuery, asArray(rootTree));
  console.log("run", queriesRun);
}
