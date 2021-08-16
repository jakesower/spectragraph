import { mapObj, pick } from "@polygraph/utils";
import {
  CompiledQuery, CompiledSchema, DataTree, ResourceTree,
} from "../types";
import { asArray } from "../utils";

type Middleware<T, U> = (val: T, next: (nextVal: T) => U) => U;

export function dataTreeToResourceTree(
  schema: CompiledSchema,
  query: CompiledQuery,
  dataTree: DataTree,
): ResourceTree {
  // the relationship type is inferred from the relationship at the level up and must be passed
  type Expander = (subTree: DataTree, subQuery: CompiledQuery, type: string) => ResourceTree;
  const expand: Expander = (subTree, subQuery, type) => {
    const resSchemaDef = schema.resources[type];
    const id = subTree[resSchemaDef.idField] as string;

    if (!id) throw new Error(`id field missing on a resource (${type}, ???)`);

    const properties = pick(subTree, subQuery.properties);
    const relationships = pick(
      subTree, Object.keys(subQuery.relationships),
    ) as { [k: string]: null | DataTree | DataTree[] };

    const relatedResourceTrees = mapObj(
      relationships,
      (relatedValue, relType) => asArray(relatedValue)
        .map((relatedRes) => expand(relatedRes, query[relType], relType)),
    );

    return {
      id,
      type,
      properties,
      relationships: relatedResourceTrees,
    };
  };

  return expand(dataTree, query, query.type);
}

export function resourceTreeToDataTree(
  schema: CompiledSchema,
  query: CompiledQuery,
  resourceTree: ResourceTree,
): DataTree {
  // the relationship type is inferred from the relationship at the level up and must be passed
  const expand = (
    subTree: ResourceTree,
    subQuery: CompiledQuery,
    type: string,
  ): DataTree => {
    const resSchemaDef = schema.resources[type];

    const properties = {
      ...pick(subTree.properties, subQuery.properties),
      [resSchemaDef.idField]: subTree.id,
    };
    const relationships = pick(subTree.relationships, Object.keys(subQuery.relationships));

    const relatedResourceTrees = mapObj(
      relationships,
      (relatedValues, relType) => {
        const schemaRelDef = schema.resources[type].relationships[relType];
        return (schemaRelDef.cardinality === "one")
          ? (relatedValues.length === 0) ? null : expand(relatedValues[0], query[relType], relType)
          : relatedValues.map((relVal) => expand(relVal, query[relType], type));
      },
    );

    return {
      type,
      ...properties,
      ...relatedResourceTrees,
    };
  };

  return expand(resourceTree, query, query.type);
}

export function makeDataTreeToResourceTreeMW(schema: CompiledSchema, query: CompiledQuery) {
  return async function dataTreeToResourceTreeMW(dataTree: DataTree, next): Promise<DataTree> {
    const resourceTree = dataTreeToResourceTree(schema, query, dataTree);
    const result = await next(resourceTree);

    return resourceTreeToDataTree(schema, query, result);
  };
}
