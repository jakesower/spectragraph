import { buildResourceTable } from "@polygraph/core/resource-table";
import { normalizeGetQuery } from "@polygraph/core/query";
import { normalizeTree } from "@polygraph/core/tree";
import { ensureCreatedResourceFields } from "@polygraph/core/validation";
import { groupBy, uniq } from "@polygraph/utils/arrays";
import { pipeThru } from "@polygraph/utils/functions";
import { filterObj, mapObj } from "@polygraph/utils/objects";
import { get } from "./get.mjs";

export function set(schema, db, rootQuery, rootTreeOrTrees) {
  const castPropToDb = (resType, propKey, val) =>
    schema.resources[resType].properties[propKey].type === "boolean"
      ? val === true
        ? 1
        : val === false
          ? 0
          : undefined
      : val;

  const rootTrees = normalizeTree(rootQuery, rootTreeOrTrees);

  const resourceTable = buildResourceTable(schema, ({ setResource }) => {
    const go = (tree) => {
      const existing = get(
        schema,
        db,
        normalizeGetQuery(schema, { type: tree.type, id: tree.id, allProps: true }),
      );
      setResource(tree, existing);
      Object.values(tree.relationships).forEach((treeRels) => {
        treeRels.forEach(go);
      });
    };

    rootTrees.forEach(go);
  });

  const byStatus = groupBy(
    Object.values(resourceTable).flatMap((t) => Object.values(t)),
    (res) => res.status,
  );

  (byStatus.inserted ?? []).forEach((res) => {
    ensureCreatedResourceFields(schema, res);

    const resDef = schema.resources[res.type];

    const defaultProps = pipeThru(schema.resources[res.type].properties, [
      (props) => filterObj(props, (prop) => "default" in prop),
      (props) => mapObj(props, (prop) => prop.default),
    ]);

    const insertProps = uniq([
      ...Object.keys(defaultProps),
      ...Object.keys(res.properties),
    ]);
    const insertPropsWithId = [...insertProps, "id"];

    const insertNodeQuery = db.prepare(
      `INSERT INTO ${resDef.store.table} (${insertPropsWithId.join(", ")}) VALUES (${[
        ...insertProps,
        "id",
      ]
        .map(() => "?")
        .join(", ")})`,
    );

    const defaultedProps = { ...defaultProps, ...res.properties };
    insertNodeQuery.run([
      ...insertProps.map((prop) => castPropToDb(res.type, prop, defaultedProps[prop])),
      res.id,
    ]);
  });

  (byStatus.updated ?? []).forEach((res) => {
    if (Object.keys(res.properties).length === 0) return;

    const resDef = schema.resources[res.type];
    const updateProps = Object.keys(res.properties);
    const updateNodeQuery = db.prepare(
      `UPDATE ${resDef.store.table} SET ${updateProps
        .map((col) => `${col} = ?`)
        .join(", ")} WHERE id = ?`,
    );

    updateNodeQuery.run([...updateProps.map((prop) => res.properties[prop]), res.id]);
  });
}
