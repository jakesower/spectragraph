import { CompiledSchema, Resource, ResourceRef } from "../types";
import { asArray, formatRef } from "../utils";
import { makeQuiver, Node } from "./quiver";

/**
 * This wraps a generic quiver. It is aware of the schema and resources in order to calculate
 * inverses.
 */

type RelationshipChanges = { hasChanges: false } | { hasChanges: true, present: ResourceRef[] };

export interface ResourceQuiverBuilder {
  // useful when constructing
  assertResource: (resource: Resource) => void;
  retractResource: (resourceRef: ResourceRef) => void;
  touchRelationship: (
    relationshipType: string,
    resource: ResourceRef,
    relatedResource: ResourceRef) => void;
}

export interface ResourceQuiverResult {
  // useful as the result
  assertedNodes: Record<string, Node>;
  retractedNodes: Record<string, ResourceRef>;
  isAdded: (ref: ResourceRef) => boolean;
  isRemoved: (ref: ResourceRef) => boolean;
  getChangedRelationships: (ref: ResourceRef) => Record<string, ResourceRef[]>;
  // getTouchedResources: (Resource | ResourceRef)[];
  getResources: () => Map<ResourceRef, (null | ResourceRef | Resource)>;
}

export type ResourceQuiverFn = (
  schema: CompiledSchema,
  builderFn: (builderFns: ResourceQuiverBuilder) => void
) => ResourceQuiverResult;

export function makeResourceQuiver(
  schema: CompiledSchema,
  builderFn: (builder: ResourceQuiverBuilder) => void,
): ResourceQuiverResult {
  const quiver = makeQuiver();

  const inverseOf = (resourceRef: ResourceRef, relName: string): string => {
    const relDef = schema.resources[resourceRef.type].relationships[relName];
    const inverse = relDef.inverse || `%inverse-${relName}`;

    return inverse;
  };

  const assertResource = (resource: Resource) => {
    quiver.assertNode(resource);
    Object.entries(resource.relationships || {}).forEach(([label, baseTargets]) => {
      const targets = asArray(baseTargets);
      quiver.setArrowGroup(resource, targets, label);
      targets.forEach((target) => {
        const inverse = inverseOf(resource, label);
        quiver.assertArrow({ source: target, target: resource, label: inverse });
      });
    });
  };

  const retractResource = (resource: Resource) => {
    if (!resource) {
      throw new Error(`Resources that do not exist cannot be deleted: ${formatRef(resource)}`);
    }

    quiver.retractNode(resource);
    Object.entries(resource.relationships || {}).forEach(([label, baseExistingTargets]) => {
      const existingTargets = asArray(baseExistingTargets);
      quiver.setArrowGroup(resource, [], label);
      existingTargets.forEach((existingTarget) => {
        const inverse = inverseOf(resource, label);
        quiver.retractArrow({ source: existingTarget, target: resource, label: inverse });
      });
    });
  };

  const touchRelationship = (
    relationshipType: string,
    resource: ResourceRef,
    relatedResource: ResourceRef,
  ) => {
    quiver.touchArrow({ source: resource, target: relatedResource, label: relationshipType });
    console.log({ relatedResource, resource, relationshipType });

    const inverse = inverseOf(resource, relationshipType);
    if (inverse) {
      console.log({ inverse });
      quiver.touchArrow({ source: relatedResource, target: resource, label: inverse });
    }
  };

  builderFn({ assertResource, retractResource, touchRelationship });

  return {
    ...quiver,
    getChangedRelationships: quiver.getChangedArrows,
    getResources: quiver.getNodes,
  };
}
