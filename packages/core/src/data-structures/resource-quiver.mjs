import { asArray, formatRef, setRelationships } from "../utils/index.mjs";
import { makeRefKey } from "../utils/make-ref-key.mjs";
import { makeQuiver } from "./quiver.mjs";

/**
 * This wraps a generic quiver. It is aware of the schema and resources in order to calculate
 * inverses.
 */

export function makeResourceQuiver(schema, builderFn) {
  const quiver = makeQuiver();
  const explicitResources = new Set();

  const inverseOf = (resourceRef, relName) => (
    schema.resources[resourceRef.type].relationships[relName].inverse
  );

  const assertResource = (updatedResource, existingResource) => {
    quiver.assertNode(updatedResource);
    explicitResources.add(makeRefKey(updatedResource));

    Object.keys(updatedResource.relationships || {})
      .forEach((relKey) => {
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

  const retractResource = (resource) => {
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
