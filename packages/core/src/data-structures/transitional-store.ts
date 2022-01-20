/* eslint-disable no-restricted-syntax, no-loop-func */

/**
 * This represents a store that has had updates made to it. It is useful for
 * representing data to be validated and then applied to the actual store.
 */

import { mapObj } from "@polygraph/utils";
import { StoreFormat } from "../memory-store";
import {
  ExpandedSchema,
  NormalResource,
  NormalResourceUpdate, ResourceRef, Schema,
} from "../types";
import { asArray, cardinalize } from "../utils";
import { defaultResources as getDefaultResources } from "../memory-store/default-resources";
import { ResourceQuiverResult } from "./resource-quiver";
import { makeRefKey } from "../utils/make-ref-key";
import { PolygraphError } from "../validations/errors";

interface TransitionalStore<S extends Schema> {
  getUpdatedResources: (resourceValidations: any[]) => Promise<NormalResource<S, keyof S["resources"]>[]>;
}

export function makeTransitionalStore<S extends Schema>(
  schema: S,
  store: StoreFormat<S>,
  resourceQuiver: ResourceQuiverResult<S>,
): TransitionalStore<S> {
  const defaultResources = getDefaultResources(schema);

  // inefficient to build; only used for errors
  let referenceToResourceMap: Record<string, ResourceRef<S, any>[]>;

  function makeNewResource<RT extends keyof S["resources"]>(
    type: RT & string,
    id: string,
  ): NormalResource<S, RT> {
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
    } as NormalResource<S, RT>;
  }

  function makeCompositeResource<RT extends keyof S["resources"]>(
    updatedResOrRef: ResourceRef<S, RT> | NormalResourceUpdate<S, RT>,
  ): NormalResource<S, RT> {
    const { type, id } = updatedResOrRef;
    const isReferenceOnly = resourceQuiver.explicitResources.has(makeRefKey(updatedResOrRef));
    const resDef = schema.resources[type];

    if (isReferenceOnly && !(id in store[type])) {
      throw new PolygraphError(
        "resource references must already be present in the store to be used", {
          ref: updatedResOrRef,
          referencingResources: getReferencingResources(updatedResOrRef),
        },
      );
    }

    const existingOrNewRes = store[type][id] ?? makeNewResource(type, id);
    const existingOrNewProps = existingOrNewRes.properties;
    const existingOrNewRels = existingOrNewRes.relationships;

    const properties = ("properties" in updatedResOrRef)
      ? mapObj(
        existingOrNewProps,
        (existingProp, propKey) => updatedResOrRef.properties[propKey] ?? existingProp,
      )
      : defaultResources[type].properties;

    const relationships = {};
    const updatedRels = resourceQuiver.getRelationshipChanges(updatedResOrRef);
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
            throw new PolygraphError("a resource has a to-one relationship with multiple resources in it", {
              resource: updatedResOrRef,
              relationship: relType,
              referencedResourceRefs: updatedRelIds,
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

    return {
      type, id, properties, relationships,
    } as NormalResource<S, RT>;
  }

  // super inefficient function that should only be triggered on error to provide info for the user
  function getReferencingResources(resRef) {
    if (!referenceToResourceMap) {
      for (const [referencingRes] of resourceQuiver.getResources()) {
        const updatedRels = resourceQuiver.getRelationshipChanges(resRef);
        referenceToResourceMap = {};

        Object.values(updatedRels).forEach((arrowChanges) => {
          const referencedRefs = ("present" in arrowChanges)
            ? arrowChanges.present
            : [...arrowChanges.asserted, ...arrowChanges.retracted];

          referencedRefs.forEach((referencedRef) => {
            const refKey = makeRefKey(referencedRef);
            if (!(refKey in referenceToResourceMap)) {
              referenceToResourceMap[refKey] = [referencingRes];
            } else {
              referenceToResourceMap[refKey].push(referencingRes);
            }
          });
        });
      }
    }

    return referenceToResourceMap[resRef];
  }

  function mapUpdatedResources(fn) {
    const updates = [];

    for (const [ref, updatedRes] of resourceQuiver.getResources()) {
      const { type, id } = ref;

      updates.push(fn({
        type,
        id,
        resource: updatedRes && makeCompositeResource(updatedRes),
      }));
    }

    return updates;
  }

  async function getUpdatedResources(resourceValidations): Promise<NormalResource<S, keyof S["resources"]>[]> {
    return Promise.all(mapUpdatedResources(async ({ type, id, resource }) => {
      const validations = resourceValidations[type] ?? [];

      await Promise.all(validations.map(
        ({ validateResource }) => validateResource(resource, store[type][id], { schema }),
      ));

      return resource;
    }));
  }

  return { getUpdatedResources };
}
