import { mapObj } from "@polygraph/utils";
import {
  CompiledQuery,
  CompiledSubQuery,
  Query,
  SubQuery,
  Schema,
  ExpandedSchema,
} from "../types";

export function compileQuery<
  S extends Schema,
  TopResType extends keyof S["resources"],
>(
  schema: S,
  query: Query<S, TopResType>): CompiledQuery<S, TopResType> {
  const errors = [];
  const fullSchema = schema as ExpandedSchema<S>;

  const expand = <
    ResType extends keyof S["resources"],
    SQ extends SubQuery<S, ResType>,
  >(subQuery: SQ, resType: ResType & string): CompiledSubQuery<S, ResType> => {
    if (subQuery.referencesOnly) {
      return {
        referencesOnly: true,
        type: resType,
      };
    }

    const resSchemaDef = fullSchema.resources[resType];
    const propertyNamesSet = new Set(Object.keys(resSchemaDef.properties));
    const relationshipNamesSet = new Set(Object.keys(resSchemaDef.relationships));

    // validate
    (subQuery.properties || []).forEach((prop) => {
      if (!propertyNamesSet.has(prop)) {
        errors.push(`${prop} is not a property on type ${resType}`);
      }
    });

    Object.keys(subQuery.relationships || {}).forEach((relType) => {
      if (!relationshipNamesSet.has(relType)) {
        errors.push(`${relType} is not a relationship defined on type ${resType}`);
      }
    });

    const properties = (
      subQuery.properties
        ? subQuery.properties.filter((prop) => propertyNamesSet.has(prop))
        : Object.keys(resSchemaDef.properties)
    );

    if (!("relationships" in subQuery)) {
      const relDefs = fullSchema.resources[resType].relationships;
      const relationships = mapObj(
        relDefs,
        (_, type: string) => ({ referencesOnly: true, type } as const),
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
        const relDef = fullSchema.resources[resType].relationships[relType];
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
    ...expand(
      query as Query<S, TopResType> & { type: TopResType },
      query.type as TopResType & string,
    ),
    id: ("id" in query) ? query.id : null,
  };

  if (errors.length > 0) throw new Error(JSON.stringify(errors));

  return output as CompiledQuery<S, TopResType>;
}
