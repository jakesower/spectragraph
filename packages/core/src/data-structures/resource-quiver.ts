import {
  CompiledSchema, Resource, ResourceRef, Schema,
} from "../types";
import { asArray, formatRef } from "../utils";
import { makeQuiver } from "./quiver";

/**
 * This wraps a generic quiver. It is aware of the schema and resources in order to calculate
 * inverses.
 */

export interface ResourceQuiverBuilder {
  // useful when constructing
  assertResource: (resource: Resource) => void;
  retractResource: (resourceRef: ResourceRef) => void;
  markRelationship: (
    relationshipType: string,
    resource: ResourceRef,
    relatedResource: ResourceRef) => void;
}

type RelationshipChanges = { present: Set<string> } | { changes: Record<string, boolean> };

export interface ResourceQuiverResult {
  getRelationshipChanges: (ref: ResourceRef) => Record<string, RelationshipChanges>;
  getResources: () => Map<ResourceRef, (null | ResourceRef | Resource)>;
}

export type ResourceQuiverFn<S extends Schema> = (
  schema: CompiledSchema<S>,
  builderFn: (builderFns: ResourceQuiverBuilder) => void
) => ResourceQuiverResult;

export function makeResourceQuiver<S extends Schema>(
  schema: CompiledSchema<S>,
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
      quiver.assertArrowGroup(resource, targets, label);
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
      quiver.assertArrowGroup(resource, [], label);
      existingTargets.forEach((existingTarget) => {
        const inverse = inverseOf(resource, label);
        quiver.retractArrow({ source: existingTarget, target: resource, label: inverse });
      });
    });
  };

  // marks relationships from existing related nodes to a resource about to be traversed
  const markRelationship = (
    relationshipType: string,
    resource: ResourceRef,
    relatedResource: ResourceRef,
  ) => {
    const inverse = inverseOf(resource, relationshipType);
    if (inverse) {
      quiver.markArrow({ source: relatedResource, target: resource, label: inverse });
    }
  };

  builderFn({ assertResource, retractResource, markRelationship });

  return {
    ...quiver,
    getRelationshipChanges: quiver.getArrowChanges,
    getResources: quiver.getNodes,
  };
}
