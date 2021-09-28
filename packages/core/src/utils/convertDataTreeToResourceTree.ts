import { pick } from "@polygraph/utils";
import { asArray } from "./asArray";
import {
  CompiledQuery,
  CompiledSchema,
  DataTree,
  ResourceTree,
  Schema,
} from "../types";

export function convertDataTreeToResourceTree<S extends Schema, TopResType extends keyof S["resources"]>(
  schema: CompiledSchema<S>,
  query: CompiledQuery<S, TopResType>,
  dataTree: DataTree,
): ResourceTree<S> {
  const expand = <ResType extends keyof S["resources"]>(
    subTree: DataTree,
    subQuery: CompiledQuery<S, ResType>,
    resType: ResType,
  ): ResourceTree<S> => {
    const resSchemaDef = schema.resources[resType];
    const id = subTree[resSchemaDef.idField as string] as string;

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

    const relDefs = resSchemaDef.relationshipsArray
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
