import { mapObj } from "@polygraph/utils";
import {
  NormalResourceUpdate, Schema, Resource, NormalResource, ExpandedSchema,
} from "../types";
import { typeValidations } from "../validations/type-validations";
import { PolygraphError } from "../validations/errors";

export type QueryTree<S extends Schema, RT extends keyof S["resources"]> = Readonly<{
  forEachResource: (fn: (res: NormalResourceUpdate<S, RT>) => void) => void,
  rootResource: NormalResourceUpdate<S, RT>;
}>;

export function normalizeResource<
  S extends Schema, RT extends keyof S["resources"] & string
>(schema: S, resourceType: RT, resource: Resource<S, RT>): NormalResource<S, RT> {
  const xs = schema as ExpandedSchema<S>;
  const schemaDef = xs.resources[resourceType];

  const properties = mapObj(schemaDef.properties, (propDef, propKey) => {
    if (!(propKey in resource)) {
      throw new PolygraphError(
        "a property was missing from the resource",
        {
          resourceType, resource, property: propKey, expectedType: propDef.type,
        },
      );
    }

    const value = resource[propKey];
    if (!typeValidations[propDef.type](value)) {
      throw new PolygraphError(
        "a property did not meet the validation criteria",
        {
          resourceType, resource, value, expectedType: propDef.type,
        },
      );
    }

    return value;
  });

  const relationships = mapObj(schemaDef.relationships, (relDef, relKey) => {
    const ensureValidRef = (ref) => {
      if (ref.type !== relDef.relatedType) {
        throw new PolygraphError(
          "relationship types must match the proper related resource type",
          {
            resourceType, resource, relationship: relKey, ref,
          },
        );
      }
      if (!("id" in ref)) {
        throw new PolygraphError(
          "resources require an id field to be present",
          {
            resourceType, resource, relationship: relKey, ref,
          },
        );
      }
    };

    if (!(relKey in resource)) {
      throw new PolygraphError(
        "a relationship was missing from the resource",
        {
          resourceType, resource, relationship: relKey,
        },
      );
    }

    const relRefOrRefs = resource[relKey];
    if (relDef.cardinality === "one") {
      if (Array.isArray(relRefOrRefs)) {
        throw new PolygraphError(
          "a to-one relationship has multiple values when it should have a single value or be null",
          { resourceType, resource, value: relRefOrRefs },
        );
      }

      if (relRefOrRefs !== null) ensureValidRef(relRefOrRefs);
      return relRefOrRefs;
    }

    if (relDef.cardinality === "many") {
      if (!Array.isArray(relRefOrRefs)) {
        if (relRefOrRefs == null) {
          throw new PolygraphError(
            "a to-many relationship has a null value instead of an empty array",
            {
              resourceType, resource, relationship: relKey, value: relRefOrRefs,
            },
          );
        }

        throw new PolygraphError(
          "a to-many relationship has a single value instead of an array of values",
          {
            resourceType, resource, relationship: relKey, value: relRefOrRefs,
          },
        );
      }

      relRefOrRefs.forEach((ref) => {
        ensureValidRef(ref);
      });
    }

    return relRefOrRefs;
  });

  if (!resource.id) {
    throw new PolygraphError("resources must have an id", { resource });
  }

  return {
    type: resourceType,
    id: resource.id,
    properties,
    relationships,
  };
}
