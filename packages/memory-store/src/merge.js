import { v4 as uuidv4 } from "uuid";
import { mapValues } from "es-toolkit";
import { applyOrMap } from "@data-prism/utils";
import {
	createResource,
	ensureValidMergeResource,
	mergeResources,
} from "@data-prism/core";
import { setInverseRelationships } from "./lib/store-helpers.js";

/**
 * Merges a resource tree into the store, creating or updating resources and their relationships.
 * Handles nested resources and maintains referential integrity through inverse relationship updates.
 *
 * WARNING: MUTATES storeGraph
 *
 * @param {import('@data-prism/core').CreateResource | import('@data-prism/core').UpdateResource} resourceTree - The resource tree to merge into the store
 * @param {import('./memory-store.js').MemoryStoreContext} context - Context object containing schema, validator, and storeGraph
 * @returns {import('@data-prism/core').NormalResource | import('@data-prism/core').NormalResource[]} The processed resource tree(s) with all nested resources created/updated
 */
export function merge(resourceOrResources, context) {
	const { schema, storeGraph, validator } = context;

	const nextGraph = mapValues(storeGraph, (g) => ({ ...g }));
	const expectedToBeCreated = mapValues(storeGraph, () => new Set());
	const created = mapValues(storeGraph, () => new Set());

	// NOTE: if an error is thrown, any change that have been made are discarded (rollback)
	const outputs = applyOrMap(resourceOrResources, (rootResource) => {
		ensureValidMergeResource(schema, rootResource, { validator });

		const go = (resource) => {
			const { type, id = uuidv4() } = resource;

			if (!storeGraph[type][id]) {
				created[type].add(id);
			}

			const defaultedResource = mergeResources(
				nextGraph[type][id] ?? createResource(schema, { type, id }),
				resource,
			);
			nextGraph[type][id] = defaultedResource;

			const nextRels = mapValues(
				resource.relationships ?? {},
				(relOrRels, relName) => {
					const preppedRels = applyOrMap(relOrRels, (rel) => {
						if (rel.attributes || rel.relationships) {
							return go(rel);
						} else if (!nextGraph[rel.type][rel.id]) {
							expectedToBeCreated[rel.type].add(rel.id);
							nextGraph[rel.type][rel.id] = createResource(schema, rel);
							return nextGraph[rel.type][rel.id];
						} else {
							return nextGraph[rel.type][rel.id];
						}
					});

					nextGraph[type][id].relationships[relName] = preppedRels;
					return preppedRels;
				},
			);

			nextGraph[type][id] = {
				...nextGraph[type][id],
				relationships: mapValues(nextGraph[type][id].relationships, (r) =>
					r ? { type: r.type, id: r.id } : null,
				),
			};

			if (storeGraph[type][id]) {
				setInverseRelationships(
					storeGraph[type][id],
					nextGraph[type][id],
					context,
				);
			}

			return { ...resource, id, relationships: nextRels };
		};

		return go(rootResource);
	});

	// ensure all the relationships that were mentioned in the merged resources actually exist
	Object.entries(expectedToBeCreated).forEach(([type, ids]) => {
		[...ids].forEach((id) => {
			if (!created[type].has(id)) {
				throw new Error(
					`Expected { type: ${type}, id: ${id} } to be created during the merge, but only found a reference to it`,
				);
			}
		});
	});

	// everything went OK, apply the changes
	Object.keys(storeGraph).forEach((r) => (storeGraph[r] = nextGraph[r]));

	return outputs;
}
