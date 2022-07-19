import { asArray } from "@polygraph/utils/arrays";
import { mapObj } from "@polygraph/utils/objects";
import { combinations, difference } from "@polygraph/utils/sets";
import { makeEmptyStore } from "./store.mjs";

const DELETED = Symbol("deleted");

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

  // ---Validation Functions-----------------------------------------------------------------------
  const ensureConsistentProperties = (resource) => {
    const { type, id } = resource;
    const stored = propertiesStore[type][id];

    if (stored) {
      const diff = Object.keys(resource.properties)
        .filter(
          (resKey) => resKey in stored && resource.properties[resKey] !== stored[resKey],
        )
        .map((k) => `${k}: ${resource.properties[k]} ≠ ${stored[k]})`);

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

      const relIdSet = new Set(asArray(relVal).map((r) => r.id));
      const storedRelSet = relationshipsStore[type][id][relKey].asserted ?? new Set();

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

  const ensureConsistentSingleRelationship = (
    resource,
    relatedId,
    relationshipKey,
    status,
  ) => {
    const { type, id } = resource;
    const stored = relationshipsStore[type][id]?.[relationshipKey];

    if (!stored) return;

    if (stored.finalized && !stored[status].has(relatedId)) {
      throw new Error(
        `${formatRef(resource)} had a complete set of relationships, but \n\n${formatRef(
          resource,
        )} was inconsistent`,
      );
    }
  };

  const ensureConsistentDeletedResource = (resource) => {
    const { type, id } = resource;

    if (id in propertiesStore[type] && propertiesStore[type][id] !== DELETED) {
      throw new Error(
        `${formatRef(resource)} was marked as deleted, but also showed up in the tree`,
      );
    }
  };

  const ensureResourceNotDeleted = (resource) => {
    const { type, id } = resource;

    if (id in propertiesStore[type] && propertiesStore[type][id] === DELETED) {
      throw new Error(
        `${formatRef(resource)} was marked as deleted, but also showed up in the tree`,
      );
    }
  };

  // ---Resource Functions-------------------------------------------------------------------------

  const setRelationshipStatus = (resource, relatedId, relationshipKey, status) => {
    const { type, id } = resource;

    ensureConsistentSingleRelationship(resource, relatedId, relationshipKey, status);

    relationshipsStore[type][id] = relationshipsStore[type][id] ?? {};

    const stored = relationshipsStore[type][id][relationshipKey] ?? {};
    const defaultStoreItem = {
      asserted: new Set(),
      existing: new Set(),
      finalized: false,
      retracted: new Set(),
    };
    const base = { ...defaultStoreItem, ...stored };

    relationshipsStore[type][id][relationshipKey] = {
      ...base,
      [status]: base[status].add(relatedId),
    };
  };

  const setProperties = (resource) => {
    const { type, id } = resource;
    const stored = propertiesStore[type][id] ?? {};
    ensureConsistentProperties(resource);

    propertiesStore[type][id] = { ...stored, ...resource.properties };
  };

  const setRelationships = (updatedResource, existingResource) => {
    const { type, id } = updatedResource;
    const resDef = schema.resources[type];

    Object.entries(updatedResource.relationships).forEach(
      ([relationshipKey, relationshipVal]) => {
        relationshipsStore[type][id] = relationshipsStore[type][id] ?? {};

        ensureConsistentRelationships(updatedResource);

        const stored = relationshipsStore[type][id][relationshipKey];
        if (!stored?.finalized) {
          const relatedIdSet = new Set(asArray(relationshipVal).map((r) => r.id));
          const { inverse, relatedType } = resDef.properties[relationshipKey];

          const existingIdSet = new Set(
            asArray(existingResource?.[relationshipKey]).map((r) => r.id),
          );

          const retracted = difference(existingIdSet, relatedIdSet);
          [...retracted].forEach((relId) => {
            propertiesStore[relatedType][relId] =
              propertiesStore[relatedType][relId] ?? {};
            resourceStatusesByType[relatedType][relId] = "updated";
          });

          relationshipsStore[type][id][relationshipKey] = {
            asserted: relatedIdSet,
            finalized: true,
            existing: existingIdSet,
            retracted,
          };

          if (inverse) {
            asArray(relationshipVal).forEach((relRes) => {
              setRelationshipStatus(relRes, id, inverse, "asserted");
            });

            retracted.forEach((invRelId) => {
              setRelationshipStatus(
                { type: relatedType, id: invRelId },
                id,
                inverse,
                "retracted",
              );
            });
          }
        }
      },
    );
  };

  const deleteResource = (existingResource) => {
    const { type, id } = existingResource;
    const resDef = schema.resources[type];

    ensureConsistentDeletedResource(existingResource);

    propertiesStore[type][id] = DELETED;
    resourceStatusesByType[type][id] = "deleted";

    Object.entries(existingResource.relationships).forEach(([relKey, relVal]) => {
      const relIds = asArray(relVal).map((rel) => rel.id);
      const relDef = resDef.properties[relKey];
      const { inverse, relatedType } = relDef;

      if (inverse) {
        relIds.forEach((relId) => {
          setRelationshipStatus(
            { type: relatedType, id: relId },
            id,
            inverse,
            "retracted",
          );
        });
      }
    });
  };

  const setResource = (updatedResource, existingResource) => {
    const { type, id } = updatedResource ?? existingResource;

    if (!updatedResource) {
      deleteResource(existingResource);
      resourceStatusesByType[type][id] = "deleted";
      return;
    }

    relationshipsStore[type][id] = relationshipsStore[type][id] ?? {};
    propertiesStore[type][id] = propertiesStore[type][id] ?? {};

    ensureResourceNotDeleted(updatedResource);
    setProperties(updatedResource);
    setRelationships(updatedResource, existingResource);

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

            out[type][id].relationships[relKey] = {
              added: [...relCombos.leftOnly],
              removed: [...relCombos.rightOnly],
            };
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

export async function buildResourceTable(schema, builderFn) {
  const resourceTable = makeResourceTable(schema);
  await builderFn(resourceTable);
  return resourceTable.finalize();
}
