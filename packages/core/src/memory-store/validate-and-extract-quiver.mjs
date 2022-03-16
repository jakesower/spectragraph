/* eslint-disable no-restricted-syntax, no-loop-func */

import { mapObj } from "@polygraph/utils";
import { asArray, cardinalize, denormalizeResource } from "../utils/utils.mjs";
import { PolygraphError } from "../validations/errors.mjs";
import { makeRefKey } from "../utils/make-ref-key.mjs";
import { normalizeResource } from "../utils/normalize-resource.mjs";
import { typeValidations } from "../validations/type-validations.mjs";
import { ERRORS } from "../strings.mjs";

function getReferencingResources(quiver, resRef) {
  const targetKey = makeRefKey(resRef);
  const output = [];

  for (const [referencingRef, referencingRes] of quiver.getResources()) {
    const updatedRels = quiver.getRelationshipChanges(referencingRef);

    Object.values(updatedRels).forEach((arrowChanges) => {
      const referencedRefs = ("present" in arrowChanges)
        ? arrowChanges.present
        : [...(arrowChanges.asserted ?? []), ...(arrowChanges.retracted ?? [])];

      referencedRefs.forEach((referencedRef) => {
        const refKey = makeRefKey(referencedRef);
        if (refKey === targetKey) {
          output.push(denormalizeResource(referencingRes));
        }
      });
    });
  }

  return output;
}

function makeEmptyUpdatesObj(schema) {
  const output = {};
  Object.keys(schema.resources).forEach((resType) => {
    output[resType] = {};
  });

  return output;
}

function makeNewNormalResource(schema, type, id) {
  const resDef = schema.resources[type];
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
  };
}

export async function validateAndExtractQuiver(schema, store, quiver, resourceValidations) {
  const updatedResources = makeEmptyUpdatesObj(schema);

  for (const [ref, value] of quiver.getResources()) {
    const { type, id } = ref;
    const isReferenceOnly = !quiver.explicitResources.has(makeRefKey(ref));

    if (isReferenceOnly && !(id in store[type])) {
      throw new PolygraphError(
        ERRORS.RESOURCE_REFERENCE_NOT_IN_STORE, {
          ref,
          referencingResources: getReferencingResources(quiver, ref),
        },
      );
    }

    if (value == null) {
      updatedResources[type][id] = null;
      continue; // eslint-disable-line no-continue
    }

    const resDef = schema.resources[type];
    const existingOrNewRes = store[type][id]
      ? normalizeResource(
        schema,
        type,
        store[type][id],
      )
      : makeNewNormalResource(schema, type, id);
    const existingOrNewProps = existingOrNewRes.properties;
    const existingOrNewRels = existingOrNewRes.relationships;
    const isNewResource = !store[type][id];

    const updatedProperties = value.properties ?? {};

    const properties = mapObj(
      existingOrNewProps,
      (existingProp, propKey) => {
        const prop = updatedProperties[propKey] ?? existingProp;
        const propDef = resDef.properties[propKey];
        const optionalAndMissing = propDef.optional && prop == null;

        if (!optionalAndMissing && !typeValidations[propDef.type](prop)) {
          if (isNewResource && !(propKey in updatedProperties)) {
            const missingRequiredProperties = Object.entries(resDef.properties)
              .filter(([checkPropName, checkPropDef]) => !checkPropDef.optional
                && !("default" in checkPropDef)
                && !(checkPropName in updatedProperties));

            throw new PolygraphError(
              ERRORS.QUERY_MISSING_CREATE_FIELDS,
              { updatedProperties, missingRequiredProperties },
            );
          }

          throw new PolygraphError(
            ERRORS.INVALID_PROPS,
            { prop, expectedType: propDef.type },
          );
        }
        return prop;
      },
    );

    const relationships = {};
    const updatedRels = quiver.getRelationshipChanges(ref);
    // console.log(ref, updatedRels)
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
            throw new PolygraphError(ERRORS.MULTIPLE_TO_ONE_RELATIONSHIPS, {
              updatedRel, relType, updatedRelIds,
            });
          }

          relationships[relType] = cardinalize(
            [...updatedRelIds].map((relId) => ({ type: relDef.relatedType, id: relId })),
            relDef,
          );
        }
      } else {
        relationships[relType] = existingOrNewRes.relationships[relType];
      }
    });

    const idField = resDef.idField ?? "id";
    const nextRes = {
      [idField]: id,
      ...properties,
      ...relationships,
    };

    const validations = resourceValidations[type] ?? [];
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(validations.map(
      ({ validateResource }) => validateResource(
        nextRes,
        store[type][id],
        { schema },
      ),
    ));

    updatedResources[type][id] = nextRes;
  }

  return updatedResources;
}
