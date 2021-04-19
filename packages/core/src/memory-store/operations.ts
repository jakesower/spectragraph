import { arraySetDifference, equals } from "@polygraph/utils";
import {
  FullSchema,
  FullSchemaRelationship,
  Resource,
  ResourceRef,
  NormalizedResources,
} from "../types";

function isInvertableRelationship(
  attribute
): attribute is FullSchemaRelationship {
  return attribute.inverse;
}

function getInverseRelationship(
  schema: FullSchema,
  relationship
): FullSchemaRelationship {
  return schema.resources[relationship.type].attributes[
    relationship.inverse
  ] as FullSchemaRelationship;
}
export function operations(schema: FullSchema, data: NormalizedResources) {
  function setToOneRelationship(type, id, attribute, newId) {
    const resource = data[type][id];
    const inverseRelationship = getInverseRelationship(
      schema,
      schema.resources[type].attributes[attribute]
    );
    const prevRelatedResourceId = resource[attribute];

    if (prevRelatedResourceId && inverseRelationship.cardinality === "one") {
      data[type][prevRelatedResourceId][attribute] = null;
    }

    data[type][id][attribute] = newId;
  }

  function updateInverses(
    resource: Resource | null,
    prevResource: Resource | null
  ) {
    const type = resource?.type || prevResource.type;

    Object.values(schema.resources[type].attributes)
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
        const inverse = getInverseRelationship(schema, relationship);
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
              data[type][prevRelatedId][inverseAttribute] = null;
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
              (prevRelatedId) =>
                (data[relationship.type][prevRelatedId][
                  inverseAttribute
                ] = null)
            );

            break;
          }
          case "one-many": {
            if (relatedId) {
              data[relationship.type][relatedId][inverseAttribute] = [
                ...data[relationship.type][relatedId][inverseAttribute],
                resource.id,
              ];
            }

            if (prevRelatedId) {
              data[relationship.type][prevRelatedId][inverseAttribute] = data[
                relationship.type
              ][prevRelatedId][inverseAttribute].filter(
                (id) => id !== prevResource.id
              );
            }

            break;
          }
          case "many-many": {
            arraySetDifference(relatedIds, prevRelatedIds).forEach((id) => {
              data[relationship.type][id][inverseAttribute] = [
                ...data[relationship.type][id][inverseAttribute],
                resource.id,
              ];
            });

            arraySetDifference(prevRelatedIds, relatedIds).forEach((id) => {
              data[relationship.type][id][inverseAttribute] = data[
                relationship.type
              ][id][inverseAttribute].filter((id) => id !== prevResource.id);
            });

            break;
          }
        }
      });
  }

  return {
    create: async (resource) => {
      if (resource.id in data[resource.type]) {
        throw new Error(
          `A ${resource.type} with id ${resource.id} already exists.`
        );
      }
      data[resource.type][resource.id] = resource.attributes;

      updateInverses(resource, null);
    },

    update: async (resource) => {
      const { id, type } = resource;

      if (!(id in data[type])) {
        throw new Error(
          `A ${resource.type} with id ${resource.id} does not exist and cannot be updated.`
        );
      }

      updateInverses(resource, { id, type, attributes: data[type][id] });

      data[type][id] = {
        ...data[type][id],
        ...resource.attributes,
      };
    },

    upsert: async (resource) => {
      const { id, type } = resource;
      return id in data[type] ? this.update(resource) : this.create(resource);
    },

    read: async (ref: ResourceRef) => {
      const { id, type } = ref;
      return data[type][id] ? { id, type, attributes: data[type][id] } : null;
    },

    delete: async (resource: ResourceRef) => {
      const { id, type } = resource;

      if (!(id in data[type])) {
        throw new Error(
          `A ${type} with id ${id} does not exist and cannot be deleted.`
        );
      }

      updateInverses(null, { id, type, attributes: data[type][id] });

      delete data[resource.type][resource.id];
    },
  };
}
