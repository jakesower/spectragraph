import { mapObj, pick } from "@polygraph/utils";
import { intersection } from "@polygraph/utils/dist/arrays";
import { asArray } from "./asArray";
import { cardinalize } from "./cardinalize";
import {
  DataTree, Query, ResourceUpdateOfType, Schema,
} from "../types";

export type QueryTree<S extends Schema, ResType extends keyof S["resources"]> = {
  allResources: ResourceUpdateOfType<S, keyof S["resources"]>[];
  descendantResources: ResourceUpdateOfType<S, keyof S["resources"]>[];
  rootResource: ResourceUpdateOfType<S, ResType>;
}

export function queryTree<
  S extends Schema,
  ResType extends keyof S["resources"],
  Q extends Query<S, ResType>
>(schema: S, query: Q, dataTree: DataTree): QueryTree<S, ResType> {
  const schemaDef = schema.resources[query.type];
  const queryRelKeys = Object.keys(
    query.relationships ?? {},
  );

  const propKeys = query.properties
    ? intersection(query.properties, Object.keys(schemaDef.properties))
    : Object.keys(schemaDef.properties);
  const relKeys = query.relationships
    ? intersection(Object.keys(query.relationships), Object.keys(schemaDef.relationships))
    : Object.keys(schemaDef.relationships);

  const treeRels = pick(dataTree, relKeys);
  const relRefs = mapObj(treeRels, (relOrRels, relKey) => {
    const relDef = schemaDef.relationships[relKey];
    const asRefs = asArray(relOrRels).map((rel) => ({ type: relDef.type, id: rel.id }));

    return cardinalize(asRefs, relDef);
  });

  // note: no validation is done at this time
  const rootResource = {
    type: query.type,
    id: dataTree.id,
    properties: pick(dataTree, propKeys),
    relationships: relRefs,
  } as ResourceUpdateOfType<S, ResType>;

  const descendantResources = queryRelKeys.flatMap((key) => {
    const subQuery = {
      ...query.relationships[key],
      type: schemaDef.relationships[key].type,
    };

    // need some kind of rough data tree validations for rel types at the very least
    return asArray(dataTree[key]).map(
      (subTree) => queryTree(schema, subQuery, subTree).allResources,
    );
  }).flat();

  const allResources = [rootResource, ...descendantResources];

  return {
    allResources,
    descendantResources,
    rootResource,
  };
}
