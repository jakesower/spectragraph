import { mapObj } from "@polygraph/utils";
import {
  CompiledQuery,
  CompiledSchema,
  CompiledSchemaRelationships,
  CompiledSubQuery,
  Query,
  SubQuery,
  Schema,
} from "../types";

export function compileQuery<S extends Schema, CS extends CompiledSchema<S>, TopResType extends keyof CS["resources"]>(
  schema: CS,
  query: Query<CS, TopResType>,
): CompiledQuery<CS, TopResType> {
  const errors = [];
  const expand = <ResType extends keyof S["resources"]>(
    subQuery: SubQuery<CS, ResType>,
    resType: ResType,
  ): CompiledSubQuery<CS, ResType> => {
    if (subQuery.referencesOnly) {
      return {
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
      const relationships = mapObj(
        relDefs,
        (relDef) => ({ referencesOnly: true, type: relDef.name } as const),
      );

      return {
        type: resType,
        properties,
        referencesOnly: false,
        relationships,
      };
    }

    const relationships = mapObj(
      subQuery.relationships,
      (queryRel, relType) => {
        const relDef = schema.resources[resType].relationships[relType];
        return expand(queryRel, relDef.type);
      },
    );

    return {
      type: resType,
      properties,
      referencesOnly: false,
      relationships,
    };
  };

  const output = {
    ...expand(query as Query<CS, TopResType> & { type: TopResType }, query.type as TopResType),
    id: ("id" in query) ? query.id : null,
  };
  if (errors.length > 0) throw new Error(JSON.stringify(errors));

  return output;
}
