import {
  applyOrMap,
  arraySetDifference,
  deepClone,
  equals,
  mapObj,
  pick,
} from "@polygraph/utils";
import {
  FullSchema,
  FullSchemaRelationship,
  Graph,
  NormalizedResources,
  Query,
  Resource,
  Schema,
  SchemaAttribute,
  SchemaRelationship,
  Store,
  QueryRelationship,
  ResourceRef,
} from "./types";

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

function getInverseRelationship(
  schema: FullSchema,
  relationship
): FullSchemaRelationship {
  return schema.resources[relationship.type].attributes[
    relationship.inverse
  ] as FullSchemaRelationship;
}

export function MemoryStore(
  schema: Schema,
  { initialData = {} }: { initialData: NormalizedResources }
): Store {
  const fullSchema = expandSchema(schema);
  let store = copyAndClean(fullSchema, initialData);

  function setToOneRelationship(type, id, attribute, newId) {
    const resource = store[type][id];
    const prevRelatedResourceId = resource[attribute];

    if (prevRelatedResourceId) {
      store[type][prevRelatedResourceId][attribute] = null;
    }

    store[type][id][attribute] = newId;
  }

  function updateInverses(
    resource: Resource | null,
    prevResource: Resource | null
  ) {
    const type = resource?.type || prevResource.type;

    Object.values(fullSchema.resources[type].attributes)
      .filter(isInvertableRelationship)
      .filter(({ name }) => {
        return (
          !resource ||
          !prevResource ||
          (name in resource.attributes &&
            !equals(resource.attributes[name], prevResource.attributes[name]))
        );
      })
      .forEach((relationship) => {
        const inverse = getInverseRelationship(fullSchema, relationship);
        const attribute = relationship.name;
        const inverseAttribute = relationship.inverse;
        const relatedId = resource
          ? (resource.attributes[attribute] as string)
          : null;
        const relatedIds: string[] = resource
          ? resource.attributes[attribute]
          : ([] as string[]);
        const prevRelatedId = prevResource
          ? (prevResource.attributes[attribute] as string)
          : null;
        const prevRelatedIds = (prevResource
          ? prevResource.attributes[attribute]
          : []) as string[];

        switch (`${relationship.cardinality}-${inverse.cardinality}`) {
          case "one-one": {
            if (relatedId) {
              setToOneRelationship(
                relationship.type,
                relatedId,
                relationship.inverse,
                resource.id
              );
            }

            if (prevRelatedId) {
              store[type][prevRelatedId][inverseAttribute] = null;
            }

            break;
          }
          case "many-one": {
            const idsToAdd = arraySetDifference(relatedIds, prevRelatedIds);
            const idsToRemove = arraySetDifference(prevRelatedIds, relatedIds);

            idsToAdd.forEach((relatedId) =>
              setToOneRelationship(
                relationship.type,
                relatedId,
                inverseAttribute,
                resource.id
              )
            );
            idsToRemove.forEach(
              (relatedId) =>
                (store[relationship.type][relatedId][inverseAttribute] = null)
            );

            break;
          }
          case "one-many": {
            if (relatedId) {
              store[relationship.type][relatedId][inverseAttribute] = [
                ...store[relationship.type][relatedId][inverseAttribute],
                resource.id,
              ];
            }

            if (prevRelatedId) {
              store[relationship.type][prevRelatedId][inverseAttribute] = store[
                relationship.type
              ][prevRelatedId][inverseAttribute].filter(
                (id) => id !== prevResource.id
              );
            }

            break;
          }
          case "many-many": {
            arraySetDifference(relatedIds, prevRelatedIds).forEach((id) => {
              store[relationship.type][id][inverseAttribute] = [
                ...store[relationship.type][id][inverseAttribute],
                resource.id,
              ];
            });

            arraySetDifference(prevRelatedIds, relatedIds).forEach((id) => {
              store[relationship.type][prevRelatedId][inverseAttribute] = store[
                relationship.type
              ][prevRelatedId][inverseAttribute].filter(
                (id) => id !== prevResource.id
              );
            });

            break;
          }
        }
      });
  }

  return {
    fetchResource: async (type, id) => {
      return { id, type, attributes: store[type][id] };
    },

    create: async (resource) => {
      if (resource.id in store[resource.type]) {
        throw new Error(
          `A ${resource.type} with id ${resource.id} already exists.`
        );
      }
      store[resource.type][resource.id] = resource.attributes;

      updateInverses(resource, null);
    },

    update: async (resource) => {
      const { id, type } = resource;

      if (!(id in store[type])) {
        throw new Error(
          `A ${resource.type} with id ${resource.id} does not exist and cannot be updated.`
        );
      }

      updateInverses(resource, { id, type, attributes: store[type][id] });

      store[type][id] = {
        ...store[type][id],
        ...resource.attributes,
      };
    },

    upsert: async (resource) => {
      const { id, type } = resource;

      return id in store[type] ? this.update(resource) : this.create(resource);
    },

    delete: async (resource: ResourceRef) => {
      const { id, type } = resource;

      if (!(id in store[type])) {
        throw new Error(
          `A ${type} with id ${id} does not exist and cannot be deleted.`
        );
      }

      updateInverses(null, { id, type, attributes: store[type][id] });

      delete store[resource.type][resource.id];
    },

    // pg level
    query: async (initQuery) => {
      const expandRelationship = (
        relationshipName: string,
        relationshipDefinition: QueryRelationship,
        type: string,
        id: string
      ): Graph | Graph[] => {
        const resource = store[type][id];
        const relatedType =
          fullSchema.resources[type].attributes[relationshipName].type;

        const x = applyOrMap(resource[relationshipName], (relatedId) => {
          return expandResource(relationshipDefinition, relatedType, relatedId);
        });
        // console.log("x");
        // console.log(x);
        return x;
      };

      const expandResource = (
        subQuery: QueryRelationship,
        type: string,
        id: string
      ): Graph => {
        const resource = store[type][id];

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
          id: id,
          type: type,
          attributes: { ...attributes, ...relationships },
        };
      };

      const expandResources = (subQuery, type) =>
        Object.keys(store[type]).map((id) =>
          expandResource(subQuery, type, id)
        );

      const result =
        "id" in initQuery
          ? expandResource(initQuery, initQuery.type, initQuery.id)
          : expandResources(initQuery, initQuery.type);

      return result;
    },
    merge: async (query, graph) => "hi",
    replace: async (query, graph) => "hullo",

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
