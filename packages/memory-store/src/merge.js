import { v4 as uuidv4 } from "uuid";
import { mapValues, pick } from "es-toolkit";
import { applyOrMap } from "@data-prism/utils";
import {
	createResource,
	ensureValidMergeResource,
	mergeResources,
} from "@data-prism/core";

// MUTATES
// TODO: Consider `updateInverseRelationships`
function unlinkRelated(schema, graph, resource, relName) {
	const { type, id } = resource;
	const existingRelRefs = graph[type][id]?.relationships?.[relName];
	const relSchema = schema.resources[type].relationships[relName];
	const relType = relSchema.type;

	// unlink existing if present
	if (existingRelRefs) {
		if (relSchema.inverse) {
			applyOrMap(existingRelRefs, (relRef) => {
				const foreignResRels = graph[relType][relRef.id].relationships;

				graph[relType][relRef.id].relationships[relSchema.inverse] =
					Array.isArray(foreignResRels[relName])
						? foreignResRels[relName].filter((f) => f.id !== id)
						: foreignResRels[relName].id === id
							? null
							: foreignResRels[relName];
			});
		}
	}
}

// MUTATES
function linkRelated(schema, graph, resource, relName) {
	const { type, id, relationships } = resource;
	if (!relationships) return;

	const relArray = Array.isArray(relationships[relName])
		? relationships[relName]
		: [relationships[relName]];
	const relRefArray = relArray.map((r) => pick(r, ["type", "id"]));

	const relSchema = schema.resources[type].relationships[relName];
	const localRef = { type, id };

	if (relSchema.inverse) {
		const inverseRelSchema =
			schema.resources[relSchema.type].relationships[relSchema.inverse];

		applyOrMap(relRefArray, (relRef) => {
			const foreignRelRefs = graph[relRef.type][relRef.id].relationships;

			graph[relRef.type][relRef.id].relationships[relSchema.inverse] =
				inverseRelSchema.cardinality === "many"
					? [...(foreignRelRefs[relName] ?? []), localRef]
					: localRef;
		});
	}
}

/**
 * Merges a resource tree into the store, creating or updating resources and their relationships.
 * Handles nested resources and maintains referential integrity through inverse relationship updates.
 *
 * WARNING: MUTATES storeGraph
 *
 * @param {import('@data-prism/core').CreateResource | import('@data-prism/core').UpdateResource} resourceTree - The resource tree to merge into the store
 * @param {Context} context - Context object containing schema, validator, store, and storeGraph
 * @returns {import('@data-prism/core').NormalResource} The processed resource tree with all nested resources created/updated
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

			const nextRes = mergeResources(
				nextGraph[type][id] ?? createResource(schema, { type, id }),
				resource,
			);

			nextGraph[type][id] = nextRes;

			const nextRels = mapValues(
				resource.relationships ?? {},
				(relOrRels, relName) => {
					unlinkRelated(schema, nextGraph, resource, relName);

					const preppedRels = applyOrMap(relOrRels, (rel) => {
						if (rel.attributes || rel.relationships) {
							return go(rel);
						} else if (!nextGraph[rel.type][rel.id]) {
							expectedToBeCreated[rel.type][rel.id];
							nextGraph[rel.type][rel.id] = createResource(schema, {
								rel,
							});

							return nextGraph[rel.type][rel.id];
						}
					});

					nextGraph[type][id].relationships[relName] = preppedRels;

					linkRelated(schema, nextGraph, nextGraph[type][id], relName);

					return preppedRels;
				},
			);

			nextGraph[type][id] = {
				...nextGraph[type][id],
				relationships: mapValues(nextGraph[type][id].relationships, (r) =>
					r
						? {
								type: r.type,
								id: r.id,
							}
						: null,
				),
			};

			return { ...resource, id, relationships: nextRels };
		};

		return go(rootResource);
	});

	// ensure all the relationships that were mentioned in the merged resources actually exist
	Object.entries(expectedToBeCreated).forEach(([type, ids]) => {
		[...ids].forEach((id) => {
			if (!created[type].has(id)) {
				`Expected { type: ${type}, id: ${id} } to be created during the merge, but only found a reference to it`;
			}
		});
	});

	// everything went OK, apply the changes
	Object.keys(storeGraph).forEach((r) => (storeGraph[r] = nextGraph[r]));

	return outputs;
}
