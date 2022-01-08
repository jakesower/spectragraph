import { pick } from "@polygraph/utils";
import {
  ResourceUpdateOfType, ResourceRef, ResourceRefOfType, Schema,
} from "../types";
import { asArray, formatRef, setRelationships } from "../utils";
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

type ReplacementRelationshipChanges<S extends Schema> = {
  present: ResourceRefOfType<S, keyof S["resources"]>[]
};
type DeltaRelationshipChanges<S extends Schema> = {
  asserted?: ResourceRefOfType<S, keyof S["resources"]>[],
  retracted?: ResourceRefOfType<S, keyof S["resources"]>[]
};
type RelationshipChanges<S extends Schema> = (
  ReplacementRelationshipChanges<S> | DeltaRelationshipChanges<S>
);

export interface ResourceQuiverResult<S extends Schema> {
  getRelationshipChanges: (ref: ResourceRef<S>) => Record<string, RelationshipChanges<S>>;
  getResources: () => Map<
    ResourceRef<S>,
    (null | ResourceRefOfType<S, keyof S["resources"]> | ResourceUpdateOfType<S, keyof S["resources"]>)
  >;
}

export type ResourceQuiverFn<S extends Schema> = (
  schema: S,
  builderFn: (builderFns: ResourceQuiverBuilder<S>) => void
) => ResourceQuiverResult<S>;

export function makeResourceQuiver<S extends Schema, ResType extends keyof S["resources"]>(
  schema: S,
  builderFn: (builder: ResourceQuiverBuilder<S>) => void,
): ResourceQuiverResult<S> {
  const quiver = makeQuiver();

  const inverseOf = (resourceRef: ResourceRef<S>, relName: string): string => (
    schema.resources[resourceRef.type].relationships[relName].inverse
  );

  const assertResource = (
    updatedResource: ResourceUpdateOfType<S, ResType>,
    existingResource: ResourceUpdateOfType<S, ResType> | null,
  ) => {
    quiver.assertNode(updatedResource);

    Object.keys(updatedResource.relationships || {}).forEach((relKey: keyof S["resources"][ResType]["relationships"] & string) => {
      const updatedRels = asArray(updatedResource.relationships[relKey]);
      const existingRels = existingResource ? asArray(existingResource.relationships[relKey]) : [];
      const deltas = setRelationships(updatedRels, existingRels, (x) => x.id);

      quiver.assertArrowGroup(updatedResource, updatedRels, relKey);

      updatedRels.forEach((target) => {
        const inverse = inverseOf(updatedResource, relKey);
        if (inverse) {
          quiver.assertArrow({ source: target, target: updatedResource, label: inverse });
        }
      });

      deltas.rightOnly.forEach((target) => {
        const inverse = inverseOf(updatedResource, relKey);
        if (inverse) {
          quiver.retractArrow({ source: target, target: updatedResource, label: inverse });
        }
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
        if (inverse) {
          quiver.retractArrow({ source: existingTarget, target: resource, label: inverse });
        }
      });
    });
  };

  builderFn({
    assertResource, retractResource,
  });

  return {
    ...quiver,
    getRelationshipChanges: quiver.getArrowChanges,
    getResources: quiver.getNodes,
  };
}
