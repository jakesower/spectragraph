import { v4 as uuidv4 } from "uuid";
import { mapValues } from "lodash-es";
import { applyOrMap } from "@data-prism/utils";
import { ensureValidMergeResource } from "@data-prism/core";
import { updateInverseRelationships } from "./lib/store-helpers.js";

/**
 * @typedef {import('./memory-store.js').MemoryStoreContext} Context
 */

/**
 * Checks if a relationship value contains nested resources (with attributes/relationships)
 * rather than simple references. Nested resources handle their own inverse relationships.
 *
 * @param {import('@data-prism/core').Ref | import('@data-prism/core').Ref[] | null} relValue - The relationship value to check
 * @returns {boolean} True if the relationship contains nested resources
 */
function containsNestedResources(relValue) {
	if (!relValue) return false;

	return Array.isArray(relValue)
		? relValue.some((r) => r.attributes || r.relationships)
		: relValue.attributes || relValue.relationships;
}

/**
 * Recursively processes a resource tree, handling inverse relationships and store updates.
 * Orchestrates the complete resource processing pipeline.
 *
 * WARNING: MUTATES storeGraph
 *
 * @param {import('@data-prism/core').CreateResource | import('@data-prism/core').UpdateResource} resource - The resource to process
 * @param {import('@data-prism/core').NormalResource | null} parent - The parent resource (for inverse relationship handling)
 * @param {any} parentRelSchema - The parent relationship schema definition
 * @param {Context} context - Context object containing schema, store, and storeGraph
 * @returns {import('@data-prism/core').NormalResource} The processed resource with all nested relationships
 */
function processResourceTree(resource, parent, parentRelSchema, context) {
	const { schema, store, storeGraph } = context;
	const resSchema = schema.resources[resource.type];
	const resourceCopy = structuredClone(resource);

	// Handle inverse relationships from parent
	if (parent && parentRelSchema?.inverse) {
		const { inverse } = parentRelSchema;
		resourceCopy.relationships = resourceCopy.relationships ?? {};
		resourceCopy.relationships[inverse] = { type: parent.type, id: parent.id };
	}

	// Prepare resource for storage and get existing reference
	const existing = store.getOne(resource.type, resource.id);
	const resultId = resource.id ?? existing?.id ?? uuidv4();

	// Optimize: Build final resource in-place to avoid intermediate objects
	const finalResource = existing
		? {
				type: resourceCopy.type,
				id: resultId,
				attributes: { ...existing.attributes, ...resourceCopy.attributes },
				relationships: {
					...existing.relationships,
					...resourceCopy.relationships,
				},
			}
		: {
				type: resourceCopy.type,
				id: resultId,
				attributes: resourceCopy.attributes ?? {},
				relationships: {
					...mapValues(resSchema.relationships, (r) =>
						r.cardinality === "one" ? null : [],
					),
					...resourceCopy.relationships,
				},
			};

	// Normalize relationship references inline (avoid extra function call)
	const normalizedForStore = {
		...finalResource,
		relationships: mapValues(finalResource.relationships, (rel, relName) => {
			const relSchema = resSchema.relationships[relName];
			if (!rel) return rel;
			return Array.isArray(rel)
				? rel.map((r) => ({ type: relSchema.type, id: r.id }))
				: { type: relSchema.type, id: rel.id };
		}),
	};

	// Store the normalized resource
	storeGraph[resource.type][resultId] = normalizedForStore;

	// Process nested relationships (this handles complex trees)
	const processedRelationships = mapValues(
		finalResource.relationships ?? {},
		(rel, relName) => {
			const relSchema = resSchema.relationships[relName];

			// Process nested resources first
			const step = (relRes) =>
				containsNestedResources(relRes)
					? processResourceTree(relRes, finalResource, relSchema, context)
					: relRes;

			const result = applyOrMap(rel, step);

			// Update normalized references in store
			storeGraph[finalResource.type][finalResource.id].relationships[relName] =
				applyOrMap(result, (r) => ({ type: relSchema.type, id: r.id }));

			return result;
		},
	);

	// Update inverse relationships for any simple refs (not nested resources)
	Object.entries(finalResource.relationships ?? {}).forEach(
		([relName, rel]) => {
			// Only update inverses for simple refs, not nested resources
			if (rel && !containsNestedResources(rel)) {
				updateInverseRelationships(finalResource, relName, rel, context);
			}
		},
	);

	return { ...finalResource, relationships: processedRelationships };
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
export function merge(resourceTree, context) {
	const { schema, validator, store } = context;

	ensureValidMergeResource(schema, resourceTree, { validator });

	/**
	 * Recursively extracts all expected existing resource references from a resource tree.
	 * Used to validate that all referenced resources already exist in the store.
	 *
	 * @param {import('@data-prism/core').CreateResource | import('@data-prism/core').UpdateResource} res - The resource to extract references from
	 * @returns {import('@data-prism/core').Ref[]} Array of resource references that should exist
	 */
	const expectedExistingResources = (res) => {
		const related = Object.values(res.relationships ?? {}).flatMap((rel) =>
			rel
				? Array.isArray(rel)
					? rel.flatMap((r) =>
							("attributes" in r || "relationships" in r) && "id" in r
								? expectedExistingResources(r)
								: rel,
						)
					: "attributes" in rel || "relationships" in rel
						? expectedExistingResources(rel)
						: rel
				: null,
		);

		return !res.id ? related : [{ type: res.type, id: res.id }, ...related];
	};

	const missing = expectedExistingResources(resourceTree)
		.filter((ref) => ref && ref.id)
		.find(({ type, id }) => !store.getOne(type, id));
	if (missing) {
		throw new Error(
			`expected { type: "${missing.type}", id: "${missing.id}" } to already exist in the graph`,
		);
	}

	return processResourceTree(resourceTree, null, null, context);
}
