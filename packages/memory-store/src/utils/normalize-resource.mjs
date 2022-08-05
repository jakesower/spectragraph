import { mapObj, partitionObj } from "@blossom/utils/objects";
import { typeValidations } from "../validations/type-validations.mjs";
import { blossomError } from "../validations/errors.mjs";

export function normalizeResource(schema, resourceType, resource) {
  const schemaDef = schema.resources[resourceType];
  const [relProps, nonRelProps] = partitionObj(
    schemaDef.properties,
    ({ type }) => type === "relationship",
  );

  const properties = mapObj(nonRelProps, (propDef, propKey) => {
    if (!(propKey in resource)) {
      throw new blossomError(
        "a property was missing from the resource",
        {
          resourceType, resource, property: propKey, expectedType: propDef.type,
        },
      );
    }

    const value = resource[propKey];
    if (!typeValidations[propDef.type](value)) {
      throw new blossomError(
        "a property did not meet the validation criteria",
        {
          resourceType, resource, value, expectedType: propDef.type,
        },
      );
    }

    return value;
  });

  const relationships = mapObj(relProps, (relDef, relKey) => {
    const ensureValidRef = (ref) => {
      if (ref.type !== relDef.relatedType) {
        throw new blossomError(
          "relationship types must match the proper related resource type",
          {
            resourceType, resource, relationship: relKey, ref,
          },
        );
      }
      if (!("id" in ref)) {
        throw new blossomError(
          "resources require an id field to be present",
          {
            resourceType, resource, relationship: relKey, ref,
          },
        );
      }
    };

    if (!(relKey in resource)) {
      throw new blossomError(
        "a relationship was missing from the resource",
        {
          resourceType, resource, relationship: relKey,
        },
      );
    }

    const relRefOrRefs = resource[relKey];
    if (relDef.cardinality === "one") {
      if (Array.isArray(relRefOrRefs)) {
        throw new blossomError(
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
          throw new blossomError(
            "a to-many relationship has a null value instead of an empty array",
            {
              resourceType, resource, relationship: relKey, value: relRefOrRefs,
            },
          );
        }

        throw new blossomError(
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
    throw new blossomError("resources must have an id", { resource });
  }

  return {
    type: resourceType,
    id: resource.id,
    properties,
    relationships,
  };
}
