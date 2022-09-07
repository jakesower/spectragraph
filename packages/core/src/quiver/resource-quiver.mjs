import { asArray, differenceBy } from "@blossom-js/utils/arrays";
import { makeQuiver } from "./quiver.mjs";

function formatRef(ref) {
  return `(${ref.type}, ${ref.id})`;
}

/**
 * This wraps a generic quiver. It is aware of the schema and resources in order to calculate
 * inverses
 */

export function makeResourceQuiver(schema, builderFn) {
  const quiver = makeQuiver();

  const inverseOf = (resourceRef, relName) =>
    schema.resources[resourceRef.type].properties[relName].inverse;

  const assert = (updatedResource, existingResource) => {
    quiver.assertNode(updatedResource);

    Object.keys(updatedResource.relationships ?? {}).forEach((relKey) => {
      const schemaRelDef = schema.resources[updatedResource.type].properties[relKey];
      const updatedRels = asArray(updatedResource.relationships[relKey]).map(
        ({ id }) => ({ id, type: schemaRelDef.relatedType }),
      );
      const existingRels = existingResource ? asArray(existingResource[relKey]) : [];
      const missingFromUpdated = differenceBy(existingRels, updatedRels, (x) => x.id);

      quiver.assertArrowGroup(updatedResource, updatedRels, relKey);

      updatedRels.forEach((target) => {
        const inverse = inverseOf(updatedResource, relKey);
        if (inverse) {
          quiver.assertArrow({ source: target, target: updatedResource, label: inverse });
        }
      });

      missingFromUpdated.forEach((target) => {
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

  const retract = (resource, resourceType) => {
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

  builderFn({ assert, retract });

  return {
    ...quiver,
    getRelationshipChanges: quiver.getArrowChanges,
    getResources: quiver.getNodes,
  };
}
