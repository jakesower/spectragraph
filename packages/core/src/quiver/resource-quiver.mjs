import { asArray } from "@polygraph/utils/arrays";
import { combinations } from "@polygraph/utils/sets";
import { makeQuiver } from "./quiver.mjs";

function formatRef(ref) {
  return `(${ref.type}, ${ref.id})`;
}

function makeRefKey(ref) {
  const { type, id } = ref;
  return JSON.stringify({ type, id });
}

/**
 * This wraps a generic quiver. It is aware of the schema and resources in order to calculate
 * inverses
 */

export function makeResourceQuiver(schema, builderFn) {
  const quiver = makeQuiver();
  const explicitResources = new Set();

  const inverseOf = (resourceRef, relName) =>
    schema.resources[resourceRef.type].properties[relName].inverse;

  const assertResource = (updatedResource, existingResource) => {
    quiver.assertNode(updatedResource);
    explicitResources.add(makeRefKey(updatedResource));

    Object.keys(updatedResource.relationships ?? {}).forEach((relKey) => {
      const schemaRelDef = schema.resources[updatedResource.type].properties[relKey];
      const updatedRels = asArray(updatedResource.relationships[relKey]).map(
        ({ id }) => ({ id, type: schemaRelDef.relatedType }),
      );
      const existingRels = existingResource ? asArray(existingResource[relKey]) : [];
      const deltas = combinations(updatedRels, existingRels, (x) => x.id);

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
          quiver.retractArrow({
            source: target,
            target: updatedResource,
            label: inverse,
          });
        }
      });
    });
  };

  const retractResource = (resource, resourceType) => {
    if (!resource) {
      throw new Error(
        `Resources that do not exist cannot be deleted: ${formatRef(resource)}`,
      );
    }

    quiver.retractNode({ type: resourceType, ...resource });
    Object.entries(resource.relationships || {}).forEach(
      ([label, baseExistingTargets]) => {
        const existingTargets = asArray(baseExistingTargets);
        quiver.assertArrowGroup(resource, [], label);
        existingTargets.forEach((existingTarget) => {
          const inverse = inverseOf(resource, label);
          if (inverse) {
            quiver.retractArrow({
              source: existingTarget,
              target: resource,
              label: inverse,
            });
          }
        });
      },
    );
  };

  builderFn({
    assertResource,
    retractResource,
  });

  return {
    explicitResources,
    ...quiver,
    getRelationshipChanges: quiver.getArrowChanges,
    getResources: quiver.getNodes,
  };
}
