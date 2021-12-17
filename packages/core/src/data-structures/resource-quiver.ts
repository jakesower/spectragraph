import { arraySetDifferenceBy } from "@polygraph/utils";
import {
  ResourceUpdateOfType, ResourceRef, ResourceRefOfType, Schema,
} from "../types";
import { asArray, formatRef } from "../utils";
import { makeQuiver } from "./quiver";

/**
 * This wraps a generic quiver. It is aware of the schema and resources in order to calculate
 * inverses.
 */

export interface ResourceQuiverBuilder<S extends Schema> {
  // useful when constructing
  assertResource: (
    udpatedResource: ResourceUpdateOfType<S, keyof S["resources"]>,
    existingResource: ResourceUpdateOfType<S, keyof S["resources"]> | null
  ) => void;
  retractResource: (resourceRef: ResourceRefOfType<S, keyof S["resources"]>) => void;
}

type RelationshipChanges = { present: Set<string> } | { changes: Record<string, boolean> };

export interface ResourceQuiverResult<S extends Schema> {
  getRelationshipChanges: (ref: ResourceRef<S>) => Record<string, RelationshipChanges>;
  getResources: () => Map<
    ResourceRef<S>,
    (null | ResourceRefOfType<S, keyof S["resources"]> | ResourceUpdateOfType<S, keyof S["resources"]>)
  >;
}

export type ResourceQuiverFn<S extends Schema> = (
  schema: S,
  builderFn: (builderFns: ResourceQuiverBuilder<S>) => void
) => ResourceQuiverResult<S>;

export function makeResourceQuiver<S extends Schema>(
  schema: S,
  markedResources: Record<string, ResourceUpdateOfType<S, keyof S["resources"]>>,
  builderFn: (builder: ResourceQuiverBuilder<S>) => void,
): ResourceQuiverResult<S> {
  const quiver = makeQuiver();
  const unassertedMarkedResources = { ...markedResources };

  const inverseOf = (resourceRef: ResourceRef<S>, relName: string): string => {
    const relDef = schema.resources[resourceRef.type].relationships[relName];
    const inverse = relDef.inverse || `%inverse-${relName}`;

    return inverse;
  };

  const assertResource = (
    updatedResource: ResourceUpdateOfType<S, keyof S["resources"]>,
    existingResource: ResourceUpdateOfType<S, keyof S["resources"]> | null,
  ) => {
    quiver.assertNode(updatedResource);
    delete unassertedMarkedResources[updatedResource.id];

    Object.keys(updatedResource.relationships || {}).forEach((relKey) => {
      const existingRels = asArray(existingResource[relKey]);
      const updatedRels = asArray(updatedResource[relKey]);

      const removedTargets = arraySetDifferenceBy(existingRels, updatedRels, (rel) => rel.id);
      quiver.assertArrowGroup(updatedResource, updatedRels, relKey);

      updatedRels.forEach((target) => {
        const inverse = inverseOf(updatedResource, relKey);
        quiver.assertArrow({ source: target, target: updatedResource, label: inverse });
      });
    });
  };

  const retractResource = (resource: ResourceUpdateOfType<S, keyof S["resources"]>) => {
    if (!resource) {
      throw new Error(`Resources that do not exist cannot be deleted: ${formatRef(resource)}`);
    }

    quiver.retractNode(resource);
    Object.entries(resource.relationships || {}).forEach(([label, baseExistingTargets]) => {
      const existingTargets = asArray(baseExistingTargets);
      quiver.assertArrowGroup(resource, [], label);
      existingTargets.forEach((existingTarget) => {
        const inverse = inverseOf(resource, label);
        quiver.retractArrow({ source: existingTarget, target: resource, label: inverse });
      });
    });
  };

  builderFn({
    assertResource, retractResource,
  });

  Object.values(unassertedMarkedResources).forEach((doomedResource) => {
    retractResource(doomedResource);
  });

  return {
    ...quiver,
    getRelationshipChanges: quiver.getArrowChanges,
    getResources: quiver.getNodes,
  };
}
