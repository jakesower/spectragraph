import { mapObj } from "@polygraph/utils";
import {
  ExpandedSchema,
  NormalizedResources,
  NormalizedResourceUpdates,
  ResourceOfType,
  Schema,
} from "../types";
import { ResourceQuiverResult } from "../data-structures/resource-quiver";
import { asArray, cardinalize } from "../utils";
import { defaultResources as getDefaultResources } from "./default-resources";
import { PolygraphToOneValidationError } from "../validations/errors";

function makeEmptyUpdatesObj<S extends Schema>(schema: S): NormalizedResourceUpdates<S> {
  const output = {} as NormalizedResourceUpdates<S>;
  Object.keys(schema.resources).forEach((resType: keyof S["resources"]) => {
    output[resType] = {};
  });

  return output;
}

function makeNewResource<S extends Schema, ResType extends keyof S["resources"]>(
  schema: S,
  type: ResType & string,
  id: string,
): ResourceOfType<S, ResType> {
  const expandedSchema = schema as ExpandedSchema<S>;
  const resDef = expandedSchema.resources[type];
  const properties = mapObj(
    resDef.properties,
    (prop) => prop.default ?? undefined,
  );
  const relationships = mapObj(resDef.relationships, (relDef) => cardinalize([], relDef));

  return {
    type,
    id,
    properties,
    relationships,
  } as ResourceOfType<S, ResType>;
}

export async function validateAndExtractQuiver<S extends Schema>(
  schema: S,
  store: NormalizedResources<S>,
  quiver: ResourceQuiverResult<S>,
  resourceValidations,
): Promise<NormalizedResourceUpdates<S>> {
  const updatedResources: any = makeEmptyUpdatesObj(schema);
  const defaultResources = getDefaultResources(schema);

  // eslint-disable-next-line no-restricted-syntax
  for (const [ref, value] of quiver.getResources()) {
    const { type, id } = ref;

    if (value == null) {
      updatedResources[type][id] = null;
      continue; // eslint-disable-line no-continue
    }

    const resDef = schema.resources[type];
    const existingOrNewRes = store[type][id] ?? makeNewResource(schema, type, id);
    const existingOrNewProps = existingOrNewRes.properties;
    const existingOrNewRels = existingOrNewRes.relationships;

    const properties = ("properties" in value)
      ? mapObj(
        existingOrNewProps,
        (existingProp, propKey) => value.properties[propKey] ?? existingProp,
      )
      : defaultResources[type].properties;

    const relationships = {};
    const updatedRels = quiver.getRelationshipChanges(ref);
    Object.entries(existingOrNewRels).forEach(([relType, existingRels]) => {
      if (relType in updatedRels) {
        const relDef = resDef.relationships[relType];
        const updatedRel = updatedRels[relType];

        if ("present" in updatedRel) {
          relationships[relType] = cardinalize(updatedRel.present, relDef);
        } else {
          const existingRelsOfType = asArray(existingRels);
          const updatedRelIds = new Set(existingRelsOfType.map((r) => r.id));
          (updatedRel.retracted ?? []).forEach((r) => updatedRelIds.delete(r.id));
          (updatedRel.asserted ?? []).forEach((r) => updatedRelIds.add(r.id));

          if (relDef.cardinality === "one" && updatedRelIds.size > 1) {
            throw new PolygraphToOneValidationError(updatedRel, relType, updatedRelIds);
          }

          relationships[relType] = cardinalize(
            [...updatedRelIds].map((relId) => ({ type: relDef.type, id: relId })),
            relDef,
          );
        }
      } else {
        relationships[relType] = existingOrNewRes.relationships[relType];
      }
    });

    const nextRes = {
      type, id, properties, relationships,
    };

    const validations = resourceValidations[type] ?? [];
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(validations.map(
      ({ validateResource }) => validateResource(nextRes, store[type][id], { schema }),
    ));

    updatedResources[type][id] = nextRes;
  }

  return updatedResources;
}
