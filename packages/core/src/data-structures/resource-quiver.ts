import { CompiledSchema, Resource, ResourceRef } from "../types";
import { formatRef } from "../utils";
import { makeQuiver, Node } from "./quiver";

/**
 * This wraps a generic quiver. It is aware of the schema and resources in order to calculate
 * inverses.
 */

export interface ResourceQuiver {
  // useful when constructing
  addResource: (resource: Resource) => void;
  removeResource: (resourceRef: ResourceRef) => void;
  touchedNodes: Record<string, ResourceRef>;

  // useful as the result
  addedNodes: Record<string, Node>;
  removedNodes: Record<string, ResourceRef>;
  getSetArrowsBySourceAndLabel: (source: ResourceRef, label: string) => ResourceRef[] | undefined;
  getAddedArrowsBySourceAndLabel: (source: ResourceRef, label: string) => ResourceRef[];
  getRemovedArrowsBySourceAndLabel: (source: ResourceRef, label: string) => ResourceRef[];
}

export function makeResourceQuiver(schema: CompiledSchema): ResourceQuiver {
  const quiver = makeQuiver();

  const inverseOf = (resourceRef: ResourceRef, relName: string): string => {
    const relDef = schema.resources[resourceRef.type].relationships[relName];
    const inverse = relDef.inverse || `%inverse-${relName}`;

    return inverse;
  };

  const addResource = (resource: Resource) => {
    quiver.addNode(resource);
    Object.entries(resource.relationships).forEach(([label, targets]) => {
      quiver.setArrowGroup(resource, targets, label);
      targets.forEach((target) => {
        const inverse = inverseOf(resource, label);
        quiver.addArrow({ source: target, target: resource, label: inverse });
      });
    });
  };

  const removeResource = (resource: Resource) => {
    if (!resource) {
      throw new Error(`Resources that do not exist cannot be deleted: ${formatRef(resource)}`);
    }

    quiver.removeNode(resource);
    Object.entries(resource.relationships).forEach(([label, existingTargets]) => {
      quiver.setArrowGroup(resource, [], label);
      existingTargets.forEach((existingTarget) => {
        const inverse = inverseOf(resource, label);
        quiver.removeArrow({ source: existingTarget, target: resource, label: inverse });
      });
    });
  };

  return {
    ...quiver,
    addResource,
    removeResource,
  };
}
