import { mapObj } from "@polygraph/utils";
import {
  ExpandedSchema,
  NormalizedResources,
  NormalizedResourceUpdates,
  ReplacementResponse,
  ResourceOfType,
  Schema,
} from "../types";
import { ResourceQuiverResult } from "../data-structures/resource-quiver";
import { asArray, cardinalize } from "../utils";
import { defaultResources as getDefaultResources } from "./default-resources";
import { validateResource } from "../utils/validate";

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

export async function extractQuiver<S extends Schema>(
  schema: S,
  store: NormalizedResources<S>,
  quiver: ResourceQuiverResult<S>,
): Promise<ReplacementResponse<S>> {
  let allValid = true;
  const allValidationErrors = [];
  const updatedResources: any = makeEmptyUpdatesObj(schema);
  const defaultResources = getDefaultResources(schema);

  // eslint-disable-next-line no-restricted-syntax
  for (const [ref, value] of quiver.getResources()) {
    const { type, id } = ref;
    type ResType = typeof type;

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
    } as ResourceOfType<S, ResType>;

    // eslint-disable-next-line no-await-in-loop
    const { isValid, errors } = await validateResource(schema as ExpandedSchema<S>, nextRes);

    if (isValid) {
      updatedResources[type][id] = nextRes;
    } else {
      allValid = false;
      allValidationErrors.push(...errors);
    }
  }

  return allValid
    ? { isValid: true, data: updatedResources }
    : { isValid: false, errors: allValidationErrors };
}
