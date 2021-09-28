import { mapObj, pick } from "@polygraph/utils";
import { asArray } from "./asArray";
import {
  CompiledExpandedQuery,
  CompiledQuery,
  CompiledSchema,
  CompiledSchemaResource,
  DataTree,
  ExpandedResourceTreeOfType,
  ResourceTree,
  Schema,
} from "../types";

export function convertResourceTreeToDataTree<S extends Schema, TopResType extends keyof S["resources"]>(
  schema: CompiledSchema<S>,
  query: CompiledQuery<S, TopResType>,
  resourceTree: ResourceTree<S>,
): DataTree {
  // the relationship type is inferred from the relationship at the level up and must be passed
  const expand = <ResType extends keyof S["resources"]>(
    subTree: ResourceTree<S>,
    subQuery: CompiledQuery<S, ResType>,
    type: ResType,
  ): DataTree => {
    if (!("properties" in subTree) || subQuery.referencesOnly === true) {
      return subTree.id ? { id: subTree.id, type } : { type };
    }

    const expandedSubTree = subTree as ExpandedResourceTreeOfType<S, ResType>;
    const expandedSubQuery = subQuery as unknown as CompiledExpandedQuery<S, ResType>;

    const resSchemaDef = schema.resources[type] as CompiledSchemaResource<S, ResType>;
    const idField = { [resSchemaDef.idField]: subTree.id };
    const nonIdFields = pick(expandedSubTree.properties, expandedSubQuery.properties);
    const properties = { ...nonIdFields, ...idField };

    type RelKeys = (keyof (typeof expandedSubQuery.relationships))[];
    const queryRels = Object.keys(expandedSubQuery.relationships) as RelKeys;

    const relationships = pick(expandedSubTree.relationships, queryRels);

    const relatedResourceTrees = mapObj(
      relationships,
      (relatedValues, relType) => {
        const schemaRelDef = schema.resources[type].relationships[relType];
        const allRelVals = asArray(relatedValues);
        return (schemaRelDef.cardinality === "one") // TODO: make card "one" avoid the need for extra check
          ? (allRelVals.length === 0)
            ? null
            : expand(
              allRelVals[0] as ResourceTree<S>,
              subQuery.relationships[relType],
              subQuery.relationships[relType].type,
            )
          : allRelVals.map((relVal) => expand(
            relVal as ResourceTree<S>,
            subQuery.relationships[relType],
            subQuery.relationships[relType].type,
          ));
      },
    );

    return {
      type,
      properties,
      relationships: relatedResourceTrees,
    };
  };

  return expand(resourceTree, query, query.type);
}
