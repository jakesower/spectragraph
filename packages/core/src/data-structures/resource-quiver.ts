import {
  NormalResourceUpdate, ResourceRef, Schema,
} from "../types";
import { asArray, formatRef, setRelationships } from "../utils";
import { makeRefKey } from "../utils/make-ref-key";
import { makeQuiver } from "./quiver";

/**
 * This wraps a generic quiver. It is aware of the schema and resources in order to calculate
 * inverses.
 */

export interface ResourceQuiverBuilder<S extends Schema> {
  // useful when constructing
  assertResource: (
    udpatedResource: NormalResourceUpdate<S, keyof S["resources"]>,
    existingResource: NormalResourceUpdate<S, keyof S["resources"]> | null
  ) => void;
  retractResource: (resourceRef: ResourceRef<S, keyof S["resources"]>) => void;
}

type ReplacementRelationshipChanges<S extends Schema> = {
  present: ResourceRef<S, keyof S["resources"]>[]
};
type DeltaRelationshipChanges<S extends Schema> = {
  asserted?: ResourceRef<S, keyof S["resources"]>[],
  retracted?: ResourceRef<S, keyof S["resources"]>[]
};
type RelationshipChanges<S extends Schema> = (
  ReplacementRelationshipChanges<S> | DeltaRelationshipChanges<S>
);

export interface ResourceQuiverResult<S extends Schema> {
  explicitResources: Set<string>;
  getRelationshipChanges: (ref: ResourceRef<S, keyof S["resources"]>) => Record<string, RelationshipChanges<S>>;
  getResources: () => Map<
    ResourceRef<S, keyof S["resources"]>,
    (null | ResourceRef<S, keyof S["resources"]> | NormalResourceUpdate<S, keyof S["resources"]>)
  >;
}

export type ResourceQuiverFn<S extends Schema> = (
  schema: S,
  builderFn: (builderFns: ResourceQuiverBuilder<S>) => void
) => ResourceQuiverResult<S>;

export function makeResourceQuiver<S extends Schema>(
  schema: S,
  builderFn: (builder: ResourceQuiverBuilder<S>) => void,
): ResourceQuiverResult<S> {
  const quiver = makeQuiver();
  const explicitResources = new Set<string>();

  const inverseOf = <RT extends keyof S["resources"]>(resourceRef: ResourceRef<S, RT>, relName: string) => (
    schema.resources[resourceRef.type].relationships[relName].inverse
  );

  const assertResource = <RT extends keyof S["resources"]>(
    updatedResource: NormalResourceUpdate<S, RT>,
    existingResource: NormalResourceUpdate<S, RT> | null,
  ) => {
    quiver.assertNode(updatedResource);
    explicitResources.add(makeRefKey(updatedResource));

    Object.keys(updatedResource.relationships || {})
      .forEach((relKey: keyof S["resources"][RT]["relationships"] & string) => {
        const updatedRels = asArray(updatedResource.relationships[relKey]);
        const existingRels = existingResource
          ? asArray(existingResource.relationships[relKey])
          : [];
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

  const retractResource = <RT extends keyof S["resources"]>(resource: NormalResourceUpdate<S, RT>) => {
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
    explicitResources,
    ...quiver,
    getRelationshipChanges: quiver.getArrowChanges,
    getResources: quiver.getNodes,
  };
}
