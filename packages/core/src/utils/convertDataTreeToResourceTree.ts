import { inlineKey, mapObj, pick } from "@polygraph/utils";
import { asArray } from "./asArray";
import {
  CompiledQuery,
  CompiledSubQuery,
  DataTree,
  ResourceTree,
  Schema,
} from "../types";

export function convertDataTreeToResourceTree<
  S extends Schema,
  TopResType extends keyof S["resources"]
>(
  schema: S,
  query: CompiledQuery<S, TopResType & string>,
  dataTree: DataTree,
): ResourceTree<S> {
  const expand = <ResType extends keyof S["resources"]>(
    subTree: DataTree,
    subQuery: CompiledSubQuery<S, ResType>,
    resType: ResType & string,
  ): ResourceTree<S> => {
    const resSchemaDef = schema.resources[resType];
    // const keyedRels = mapObj(resSchemaDef.relationships, (rel) => inlineKey(rel, "name"));
    const keyedRels = inlineKey(resSchemaDef.relationships, "name");
    const relationshipsArray = Object.values(keyedRels);
    const id = "idField" in subTree ? subTree[resSchemaDef.idField as string] : subTree.id;

    // TODO: the ID can possibly be sussed out for to-one relationships when unspecified
    if (!id) throw new Error(`id field missing on a resource (${resType}, ???)`);

    if (subQuery.referencesOnly === true) {
      return {
        id, type: resType, properties: {}, relationships: {},
      };
    }

    const properties = pick(subTree, subQuery.properties as string[]) as Record<
      keyof S["resources"][ResType]["properties"],
      any // todo
    >;

    const relDefs = relationshipsArray
      .filter((rel) => (rel.name in subQuery.relationships) && (rel.name in subTree));
    const expandedRelationships = Object.fromEntries(relDefs.map((relDef) => {
      const relatedRess = asArray(subTree[relDef.name as string]) as DataTree[];
      const nextSubQuery = subQuery.relationships[relDef.name];

      return [
        relDef.name,
        relatedRess.map((relRes) => expand(relRes, nextSubQuery, relDef.type)),
      ];
    })) as Record<keyof S["resources"][ResType]["relationships"], any>;

    return {
      id,
      type: resType,
      properties,
      relationships: expandedRelationships,
    };
  };

  return expand(dataTree, query, query.type);
}
