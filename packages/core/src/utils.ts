import { mapObj, pick } from "@polygraph/utils";
import {
  CompiledQuery,
  DataTree, DividedResource, Query, QueryRelationship, Resource, ResourceRef, ResourceTree,
} from "./types";
import { Schema, SchemaType } from "./data-structures/schema";

export function asArray<T>(maybeArray: null | T | T[]): T[] {
  return maybeArray === null ? [] : Array.isArray(maybeArray) ? maybeArray : [maybeArray];
}

export function divideAttributes(schema: Schema, resource: Resource): DividedResource {
  const { id, type, attributes } = resource;
  const resDef = schema.resources[type];

  return {
    type,
    id,
    properties: pick(attributes, resDef.propertiesArray.map((p) => p.name)),
    relationships: pick(attributes, resDef.relationshipsArray.map((r) => r.name)),
  };
}

// TODO:
// Integrate params
export function compileQuery(schema: SchemaType, query: Query): CompiledQuery {
  const errors = [];

  const expand = (subQuery: QueryRelationship, type: string): CompiledQuery => {
    const resSchemaDef = schema.resources[type];

    // validate
    (query.properties || []).forEach((prop) => {
      if (!resSchemaDef.propertyNames.has(prop)) {
        errors.push(`${prop} is not a property defined on type ${type}`);
      }
    });

    Object.keys(query.relationships || {}).forEach((relType) => {
      if (!resSchemaDef.relationshipNames.has(relType)) {
        errors.push(`${relType} is not a relationship defined on type ${type}`);
      }
    });

    const properties = ("properties" in query) ? Array.from(resSchemaDef.propertyNames) : query.properties;
    const relationships = mapObj(query.relationships || {}, (queryRel, relType) => {
      const relDef = resSchemaDef.relationships[relType];
      return expand(queryRel, relDef.type);
    });

    return {
      type,
      properties,
      relationships,
      params: query.params || {},
    };
  };

  const output = expand(query, query.type);

  if (errors.length > 0) throw new Error(JSON.stringify(errors));

  return output;
}

export function convertDataTreeToResourceTree(
  schema: SchemaType,
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

export function convertResourceTreeToDataTree(
  schema: SchemaType,
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
      properties,
      relationships: relatedResourceTrees,
    };
  };

  return expand(resourceTree, query, query.type);
}

// please let tuples/records come soon
export const refsEqual = (left: ResourceRef, right: ResourceRef): boolean => (
  left.type === right.type && left.id === right.id
);

export const refStr = (ref: ResourceRef): string => `(${ref.type}, ${ref.id})`;
