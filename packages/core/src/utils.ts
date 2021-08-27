/* eslint-disable @typescript-eslint/no-explicit-any */

import { mapObj, pick } from "@polygraph/utils";
import {
  CompiledQuery,
  CompiledSchema,
  DataTree, Query, QueryRelationship, ResourceRef, ResourceTree,
} from "./types";

export function asArray<T>(maybeArray: null | T | T[]): T[] {
  return !maybeArray
    ? []
    : Array.isArray(maybeArray)
      ? [...maybeArray]
      : [maybeArray];
}

const defaultRels = (names: string[]): [string, QueryRelationship][] => (
  names.map((name) => [name, { referencesOnly: true }])
);

// TODO:
// Integrate params?
export function compileQuery(schema: CompiledSchema, query: Query): CompiledQuery {
  const errors = [];

  const expand = (subQuery: QueryRelationship, type: string): CompiledQuery => {
    if (subQuery.referencesOnly) {
      return {
        id: null,
        referencesOnly: true,
        type,
      };
    }

    const resSchemaDef = schema.resources[type];

    // validate
    (subQuery.properties || []).forEach((prop) => {
      if (!resSchemaDef.propertyNamesSet.has(prop)) {
        errors.push(`${prop} is not a property defined on type ${type}`);
      }
    });

    Object.keys(subQuery.relationships || {}).forEach((relType) => {
      if (!resSchemaDef.relationshipNamesSet.has(relType)) {
        errors.push(`${relType} is not a relationship defined on type ${type}`);
      }
    });

    const properties = subQuery.properties
      ? subQuery.properties.filter((prop) => resSchemaDef.propertyNamesSet.has(prop))
      : Array.from(resSchemaDef.propertyNames);

    const queryRels = subQuery.relationships
      ? Object.entries(subQuery.relationships)
      : defaultRels(resSchemaDef.relationshipNames);

    const relationships = queryRels.reduce(
      (out, [relType, queryRel]) => {
        const relDef = resSchemaDef.relationships[relType];
        return { ...out, [relType]: expand(queryRel, relDef.type) };
      },
      {},
    );

    return {
      id: query.id || null, // sus
      type,
      properties,
      referencesOnly: false,
      relationships,
    };
  };

  const output = expand(query, query.type);
  if (errors.length > 0) throw new Error(JSON.stringify(errors));

  return output;
}

export function convertDataTreeToResourceTree(
  schema: CompiledSchema,
  query: CompiledQuery,
  dataTree: DataTree,
): ResourceTree {
  // the relationship type is inferred from the relationship at the level up and must be passed
  type Expander = (subTree: DataTree, subQuery: CompiledQuery, type: string)
    => ResourceTree;
  const expand: Expander = (subTree, subQuery, type) => {
    const resSchemaDef = schema.resources[type];
    const id = subTree[resSchemaDef.idField] as string;

    if (!id) throw new Error(`id field missing on a resource (${type}, ???)`);

    if (subQuery.referencesOnly === true) {
      return {
        id, type, properties: {}, relationships: {},
      };
    }

    const properties = pick(subTree, subQuery.properties);

    const relDefs = resSchemaDef.relationshipsArray
      .filter((rel) => rel.name in subQuery.relationships);
    const expandedRelationships = Object.fromEntries(relDefs.map((relDef) => {
      const relatedRess = asArray(subTree[relDef.name]) as DataTree[];
      const nextSubQuery = subQuery.relationships[relDef.name];

      return [
        relDef.name,
        relatedRess.map((relRes) => expand(relRes, nextSubQuery, relDef.type)),
      ];
    }));

    return {
      id,
      type,
      properties,
      relationships: expandedRelationships,
    };
  };

  return expand(dataTree, query, query.type);
}

export function convertResourceTreeToDataTree(
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
    if (!("properties" in subTree) || subQuery.referencesOnly === true) {
      return subTree.id ? { id: subTree.id, type } : { type };
    }

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
          ? (relatedValues.length === 0)
            ? null
            : expand(relatedValues[0] as ResourceTree, query[relType], relType)
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

export const formatRef = (ref: ResourceRef): string => `(${ref.type}, ${ref.id})`;

export const toRef = (ref: ResourceRef): ResourceRef => pick(ref, ["id", "type"]);
