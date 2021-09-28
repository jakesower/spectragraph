import { mapObj } from "@polygraph/utils";
import {
  CompiledQuery, CompiledSchema, Query, QueryRelationship, Schema,
} from "../types";

export function compileQuery<S extends Schema, TopResType extends keyof S["resources"]>(
  schema: CompiledSchema<S>,
  query: Query,
): CompiledQuery<S, TopResType> {
  // // for when query.relationships isn't specified
  // const defaultRels = <ResType extends keyof S["resources"]>(
  //   resType: ResType,
  // ): Record<keyof S["resources"][ResType]["relationships"], CompiledQuery<S>> => (
  //     mapObj(schema.resources[resType].relationships, (relDef) => ({
  //       id: null,
  //       referencesOnly: true,
  //       type: relDef.type,
  //     }))
  //   );

  const errors = [];
  const expand = <ResType extends keyof S["resources"]>(
    subQuery: QueryRelationship,
    resType: ResType,
  ): CompiledQuery<S, ResType> => {
    if (subQuery.referencesOnly) {
      return {
        id: null,
        referencesOnly: true,
        type: resType,
      };
    }

    const resSchemaDef = schema.resources[resType];

    // validate
    (subQuery.properties || []).forEach((prop) => {
      if (!resSchemaDef.propertyNamesSet.has(prop)) {
        errors.push(`${prop} is not a property defined on type ${resType}`);
      }
    });

    Object.keys(subQuery.relationships || {}).forEach((relType) => {
      if (!resSchemaDef.relationshipNamesSet.has(relType)) {
        errors.push(`${relType} is not a relationship defined on type ${resType}`);
      }
    });

    const properties = (subQuery.properties
      ? subQuery.properties.filter((prop) => resSchemaDef.propertyNamesSet.has(prop))
      : Array.from(resSchemaDef.propertyNames));

    if (!("relationships" in subQuery)) {
      const relDefs = schema.resources[resType].relationships;
      const relationships = mapObj(relDefs, (relDef) => (
        {
          id: ("id" in query) ? query.id : null,
          referencesOnly: true,
          type: relDef.type,
        } as const
      ));

      return {
        id: ("id" in query) ? query.id : null, // sus
        type: resType,
        properties,
        referencesOnly: false,
        relationships,
      };
    }

    const relationships = mapObj(
      subQuery.relationships as Record<keyof S["resources"][ResType]["relationships"], QueryRelationship>,
      (queryRel, relType) => {
        const relDef = schema.resources[resType].relationships[relType];
        return expand(queryRel, relDef.type);
      },
    );

    return {
      id: ("id" in query) ? query.id : null, // sus
      type: resType,
      properties,
      referencesOnly: false,
      relationships,
    } as const;
  };

  const output = expand(query as Query & { type: TopResType }, query.type as TopResType);
  if (errors.length > 0) throw new Error(JSON.stringify(errors));

  return output;
}
