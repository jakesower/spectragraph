import { asArray } from "@polygraph/utils/arrays";
import { mapObj } from "@polygraph/utils/objects";
import { combinations, difference } from "@polygraph/utils/sets";
import { makeEmptyStore } from "./store.mjs";

function formatRef(ref) {
  return `(${ref.type}, ${ref.id})`;
}

/**
 * The point of this data structure is twofold:
 *
 * 1. Transform a tree into a table.
 * 2. Ensure internal consistency within the tree in the process.
 */

export function makeResourceTable(schema) {
  const propertiesStore = makeEmptyStore(schema);
  const relationshipsStore = makeEmptyStore(schema);
  const resourceStatusesByType = mapObj(schema.resources, () => ({}));

  // ensures
  const ensureConsistentProperties = (resource) => {
    const { type, id } = resource;
    const stored = propertiesStore[type][id];

    if (stored) {
      const diff = Object.keys(ensureConsistentProperties.properties)
        .filter(
          (resKey) =>
            resKey in stored.properties &&
            resource.properties[resKey] !== stored.properties[resKey],
        )
        .map((k) => `${k}: ${resource.properties[k]} ≠ ${stored.properties[k]})`);

      if (diff.length > 0) {
        throw new Error(
          `The properties of a resource were set inconsistently. (${formatRef(
            resource,
          )}):\n\n${diff.join("\n")}`,
        );
      }
    }
  };

  const ensureConsistentRelationships = (resource) => {
    const { type, id } = resource;
    const stored = relationshipsStore[type][id];

    if (!stored) return;

    Object.entries(resource.relationships).forEach(([relKey, relVal]) => {
      if (!(relKey in relationshipsStore[type][id])) return;

      const relIdSet = asArray(relVal).map((r) => r.id);
      const storedRelSet = relationshipsStore[type][id][relKey].asserted;

      const mismatches = storedRelSet.finalized
        ? [...difference(relIdSet, storedRelSet), ...difference(storedRelSet, relIdSet)]
        : [...difference(storedRelSet, relIdSet)];

      if (mismatches.length > 1) {
        const refStr = mismatches
          .map((rel) => formatRef({ relatedType: relKey, id: rel.id }))
          .join("\n");

        throw new Error(
          `${formatRef(
            resource,
          )} had a complete set of relationships, but different targets were asserted\n\n${refStr}`,
        );
      }
    });
  };

  const ensureConsistentSingleRelationship = (resource, relatedId, relationshipKey) => {
    const { type, id } = resource;
    const stored = relationshipsStore[type][id]?.[relationshipKey];

    if (!stored) return;

    if (stored.finalized && !stored.asserted.has(relatedId)) {
      throw new Error(
        `${formatRef(resource)} had a complete set of relationships, but \n\n${formatRef(
          resource,
        )} was asserted`,
      );
    }
  };

  const ensureConsistentDeletedResource = (resource) => {
    const { type, id } = resource;

    if (id in propertiesStore[type] && propertiesStore[type][id] !== null) {
      throw new Error(
        `${formatRef(resource)} was marked as deleted, but also showed up in the tree`,
      );
    }
  };

  const ensureResourceNotDeleted = (resource) => {
    const { type, id } = resource;

    if (id in propertiesStore[type] && propertiesStore[type][id] === null) {
      throw new Error(
        `${formatRef(resource)} was marked as deleted, but also showed up in the tree`,
      );
    }
  };

  const deleteResource = (resource) => {
    const { type, id } = resource;
    const resDef = schema.resources[type];

    ensureConsistentDeletedResource(resource);
    propertiesStore[type][id] = null;

    Object.entries(resource.relationships).forEach(([relKey, relVal]) => {
      const relDef = resDef.properties[relKey];
      const { inverse, relatedType } = relDef;

      if (inverse) {
        asArray(relVal).forEach((relRes) => {
          propertiesStore[relatedType][relRes.id] =
            propertiesStore[relatedType][relRes.id] ?? {};
          const storedRel = propertiesStore[relatedType][relRes.id][inverse];

          propertiesStore[relatedType][relRes.id][inverse] = storedRel
            ? { ...storedRel, retracted: storedRel.retracted.add(id) }
            : {
              asserted: new Set(),
              finalized: false,
              retracted: new Set(id),
            };
        });
      }
    });
  };

  const assertRelationship = (resource, relatedId, relationshipKey) => {
    const { type, id } = resource;

    ensureConsistentSingleRelationship(resource, relatedId, relationshipKey);

    relationshipsStore[type][id] = relationshipsStore[type][id] ?? {};
    const stored = relationshipsStore[type][id][relationshipKey];

    relationshipsStore[type][id][relationshipKey] = stored
      ? { ...stored, asserted: stored.asserted.add(relatedId) }
      : { asserted: new Set(relatedId), finalized: false, retracted: new Set() };
  };

  const setProperties = (resource) => {
    const { type, id } = resource;
    const stored = propertiesStore[type][id] ?? {};
    ensureConsistentProperties(resource);

    propertiesStore[type][id] = { ...stored, ...resource.properties };
  };

  const setRelationships = (resource) => {
    const { type, id } = resource;
    const resDef = schema.resources[type];

    Object.entries(resource.relationships).forEach(
      ([relationshipKey, relationshipVal]) => {
        relationshipsStore[type][id] = relationshipsStore[type][id] ?? {};

        ensureConsistentRelationships(resource);

        const stored = relationshipsStore[type][id][relationshipKey];
        if (!stored?.finalized) {
          const relatedIdSet = new Set(asArray(relationshipVal).map((r) => r.id));
          const { inverse } = resDef.properties[relationshipKey];

          relationshipsStore[type][id][relationshipKey] = {
            asserted: relatedIdSet,
            finalized: true,
            retracted: stored?.retracted ?? new Set(),
          };

          if (inverse) {
            asArray(relationshipVal).forEach((relRes) => {
              assertRelationship(relRes, id, relationshipKey);
            });
          }
        }
      },
    );
  };

  const setResource = (updatedResource, existingResource) => {
    const { type, id } = updatedResource;

    if (!updatedResource) {
      deleteResource(existingResource);
      resourceStatusesByType[type][id] = "deleted";
      return;
    }

    ensureResourceNotDeleted(updatedResource);
    setProperties(updatedResource);
    setRelationships(updatedResource);

    resourceStatusesByType[type][id] = existingResource ? "updated" : "inserted";
  };

  const finalize = () => {
    const out = makeEmptyStore(schema);

    Object.entries(propertiesStore).forEach(([type, ressOfType]) => {
      Object.entries(ressOfType).forEach(([id, properties]) => {
        out[type][id] = {
          type,
          id,
          properties,
          relationships: {}, // mutated below
          status: resourceStatusesByType[type][id],
        };

        Object.entries(relationshipsStore[type][id] ?? {}).forEach(
          ([relKey, relIdSet]) => {
            const relCombos = combinations(relIdSet.asserted, relIdSet.retracted);

            if (relCombos.intersection.size > 0) {
              throw new Error("some relationships were asserted and retracted TODO");
            }

            out[type][id].relationships[relKey] = relCombos.finalized
              ? { set: relCombos.left }
              : { added: relCombos.leftOnly, removed: relCombos.rightOnly };
          },
        );
      });
    });

    return out;
  };

  return {
    deleteResource,
    finalize,
    setResource,
  };
}

export function buildResourceTable(schema, builderFn) {
  const resourceTable = makeResourceTable(schema);
  builderFn(resourceTable);
  return resourceTable.finalize();
}
