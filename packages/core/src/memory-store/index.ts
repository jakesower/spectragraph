import {
  applyOrMap,
  arraySetDifference,
  deepClone,
  equals,
  mapObj,
  omitKeys,
  pick,
} from "@polygraph/utils";
import {
  FullSchema,
  FullSchemaRelationship,
  Graph,
  NormalizedResources,
  Schema,
  Store,
  Query,
  QueryRelationship,
  Resource,
  ResourceRef,
  Operation,
} from "../types";
import { operations } from "./operations";

function isInvertableRelationship(
  attribute
): attribute is FullSchemaRelationship {
  return attribute.inverse;
}

// performs a deep clone and ensures all invertable relationships line up
function copyAndClean(
  schema: FullSchema,
  data: NormalizedResources
): NormalizedResources {
  Object.keys(data).forEach((resourceType) => {
    const relationshipAttributes = Object.values(
      schema.resources[resourceType].attributes
    ).filter(isInvertableRelationship);

    Object.entries(data[resourceType]).forEach(([resourceId, resource]) => {
      relationshipAttributes.forEach((relAttr) => {
        applyOrMap(resource[relAttr.name], (foreignId) => {
          if (foreignId) {
            const foreignInverses =
              data[relAttr.type][foreignId][relAttr.inverse];
            const okay = Array.isArray(foreignInverses)
              ? foreignInverses.includes(resourceId)
              : foreignInverses === resourceId;

            if (!okay) {
              throw new Error(
                `Relationship mismatch: (${resourceType}, ${resourceId}) does not have a corresponding inverse (${relAttr.type}, ${foreignId})`
              );
            }
          }
        });
      });
    });
  });

  return deepClone(data);
}

// ensure some convenience attributes are available for iteration
function expandSchema(rawSchema: Schema): FullSchema {
  return {
    ...rawSchema,
    resources: mapObj(rawSchema.resources, (val, key) => {
      const nextAttributes = mapObj(val.attributes, (attrVal, attrKey) => ({
        ...attrVal,
        name: attrKey,
      }));

      return {
        ...val,
        name: key,
        attributes: nextAttributes,
        // attributeList: Object.values(nextAttributes),
      };
    }),
  };
}

export function MemoryStore(
  schema: Schema,
  { initialData = {} }: { initialData: NormalizedResources }
): Store {
  const fullSchema = expandSchema(schema);
  let data = copyAndClean(fullSchema, initialData);
  const contextualOperations = operations(fullSchema, data);

  function fleshedRelationship(type, relationship) {
    console.log({ type, relationship });
    return fullSchema.resources[type].attributes[
      relationship
    ] as FullSchemaRelationship;
  }

  async function extractOperations(
    updatedResourceOrResources: Resource | Resource[] | null,
    existingRefOrRefs: ResourceRef | ResourceRef[],
    subQuery: QueryRelationship,
    skipDelete: boolean
  ): Promise<Operation[]> {
    const forceArray = <T>(arrayOrValue: T | T[]): T[] => {
      if (Array.isArray(arrayOrValue)) return arrayOrValue;
      return arrayOrValue == null ? [] : [arrayOrValue];
    };

    const updatedResources = forceArray(updatedResourceOrResources);
    const existingRefs = forceArray(existingRefOrRefs);
    const type = (updatedResources[0] || existingRefs[0]).type;

    const resourceOperationsPromise = Promise.all(
      updatedResources.flatMap(async (updatedResource) => {
        const existingResource = await contextualOperations.read({
          type,
          id: updatedResource.id,
        });

        const related = await Promise.all(
          Object.entries(subQuery.relationships || {}).flatMap(
            ([relationshipName, relationshipDefinition]) => {
              const nextRelationship = fleshedRelationship(
                relationshipName,
                relationshipDefinition
              );
              const attrName = nextRelationship.name;
              const nextExistingRefOrRefs = existingResource
                ? existingResource[attrName]
                : null;

              return extractOperations(
                updatedResource[attrName],
                nextExistingRefOrRefs,
                relationshipDefinition,
                skipDelete
              );
            }
          )
        ).then((x) => x.flat());

        if (!existingResource) {
          return [
            { type: "create", resource: updatedResource },
            ...related,
          ] as Operation[];
        } else if (!equals(updatedResource, existingResource)) {
          return [
            { type: "update", resource: updatedResource },
            ...related,
          ] as Operation[];
        } else {
          return related;
        }
      })
    ).then((x) => x.flat());

    const localDeletions = skipDelete
      ? []
      : existingRefs
          .filter(({ id }) => !updatedResources.some((r) => r.id === id))
          .map((ref) => ({ type: "delete", resource: ref } as Operation));

    const resourceOperations = await resourceOperationsPromise;

    return [...resourceOperations, ...localDeletions];
  }

  const runQuery = async (initQuery) => {
    const expandRelationship = (
      relationshipName: string,
      relationshipDefinition: QueryRelationship,
      type: string,
      id: string
    ): Graph | Graph[] => {
      const resource = data[type][id];
      const relatedType =
        fullSchema.resources[type].attributes[relationshipName].type;

      return applyOrMap(resource[relationshipName], (relatedId) =>
        expandResource(relationshipDefinition, relatedType, relatedId)
      );
    };

    const expandResource = (
      subQuery: QueryRelationship,
      type: string,
      id: string
    ): Graph => {
      const resource = data[type][id];

      if (!resource) {
        return null;
      }

      const attributes = subQuery.attributes
        ? pick(resource.attributes, subQuery.attributes)
        : resource;
      const relationships =
        "relationships" in subQuery
          ? mapObj(
              subQuery.relationships,
              (relationshipDefinition, relationshipName) =>
                expandRelationship(
                  relationshipName,
                  relationshipDefinition,
                  type,
                  id
                )
            )
          : {};

      return {
        id,
        type,
        attributes: { ...attributes, ...relationships },
      };
    };

    const expandResources = (subQuery, type) =>
      Object.keys(data[type]).map((id) => expandResource(subQuery, type, id));

    const result =
      "id" in initQuery
        ? expandResource(initQuery, initQuery.type, initQuery.id)
        : expandResources(initQuery, initQuery.type);

    return result;
  };

  const transaction = async (operations: Operation[]) => {
    // TODO: scan for inconsistencies and all that jazz

    operations.forEach(({ resource, type }) => {
      contextualOperations[type](resource);
    });
  };

  return {
    ...operations(fullSchema, data),

    upsert: async (resource) => {
      const { id, type } = resource;
      return id in data[type]
        ? contextualOperations.update(resource)
        : contextualOperations.create(resource);
    },
    query: runQuery,
    merge: async (query, graph) => {
      const existing = await runQuery(query);
      const operations = await extractOperations(graph, existing, query, true);

      return transaction(operations);
    },
    replace: async (query, graph) => {
      const existing = await runQuery(query);
      const operations = await extractOperations(graph, existing, query, false);

      return transaction(operations);
    },
    transaction,

    // are these relationship methods replaceable with merge/replace above?
    // replaceRelationship({ type: 'bear', id: '1', relationship: 'home', foreignId: '2' })
    // ~equivalent to~
    // replace({ type: 'bear', id: '1' }, { type: 'bears', id: '1', home: '2' })

    // appendRelationships({ type: 'bear', id: '1', relationship: 'powers', foreignIds: ['2'] })
    // ~NOT equivalent to~
    // merge({ type: 'bear', id: '1' }, { type: 'bears', id: '1', powers: ['2'] })

    // it appears that the singular e.g. "replaceRelationship" can go, while "replaceRelationships" should stay,
    // but there's no harm in keeping them all?

    replaceRelationship: async () => {},
    replaceRelationships: async () => {},
    appendRelationships: async () => {},
    deleteRelationship: async () => {},
    deleteRelationships: async () => {},
  };
}
