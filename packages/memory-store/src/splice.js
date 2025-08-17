import { v4 as uuidv4 } from "uuid";
import { mapValues, pick } from "lodash-es";
import { applyOrMap } from "@data-prism/utils";
import { ensureValidSpliceResource } from "@data-prism/core";

/**
 * @typedef {import('./memory-store.js').MemoryStoreContext} Context
 */

/**
 * Handles inverse relationship updates for one-to-many cardinality.
 * Adds the parent reference to the resource's inverse relationship array.
 *
 * @param {import('@data-prism/core').CreateResource | import('@data-prism/core').UpdateResource} resource - The resource to update
 * @param {import('@data-prism/core').NormalResource} parent - The parent resource
 * @param {string} inverse - The inverse relationship name
 * @returns {void}
 */
function updateOneToManyInverse(resource, parent, inverse) {
	resource.relationships = resource.relationships ?? {};
	if (
		!(resource.relationships[inverse] ?? []).some((r) => r.id === parent.id)
	) {
		resource.relationships[inverse] = [
			...(resource.relationships[inverse] ?? []),
			{ type: parent.type, id: parent.id },
		];
	}
}

/**
 * Handles inverse relationship updates for one-to-one cardinality.
 * Updates the resource's inverse relationship and cleans up any previous one-to-one references.
 *
 * WARNING: MUTATES storeGraph
 *
 * @param {import('@data-prism/core').CreateResource | import('@data-prism/core').UpdateResource} resource - The resource to update
 * @param {import('@data-prism/core').NormalResource} parent - The parent resource
 * @param {string} inverse - The inverse relationship name
 * @param {Context} context - Context object containing store and storeGraph
 * @returns {void}
 */
function updateOneToOneInverse(resource, parent, inverse, context) {
	const { store, storeGraph } = context;
	const existing = store.getOne(parent.type, parent.id);
	const existingRef = existing?.relationships?.[inverse];

	if (existingRef && existingRef.id !== parent.id) {
		storeGraph[existing.type][existing.id] = {
			...existing,
			relationships: { ...existing.relationships, [inverse]: null },
		};
	}

	resource.relationships[inverse] = { type: parent.type, id: parent.id };
}

/**
 * Handles inverse relationship maintenance between a resource and its parent.
 * Delegates to specific handlers based on relationship cardinality.
 *
 * WARNING: MUTATES storeGraph (via updateOneToOneInverse)
 *
 * @param {import('@data-prism/core').CreateResource | import('@data-prism/core').UpdateResource} resource - The resource to process
 * @param {import('@data-prism/core').NormalResource} parent - The parent resource
 * @param {any} parentRelSchema - The parent relationship schema definition
 * @param {Context} context - Context object containing schema, store, and storeGraph
 * @returns {void}
 */
function handleInverseRelationships(
	resource,
	parent,
	parentRelSchema,
	context,
) {
	if (!parent || !parentRelSchema?.inverse) return;

	const { schema } = context;
	const { inverse } = parentRelSchema;
	const relSchema = schema.resources[resource.type].relationships[inverse];

	resource.relationships = resource.relationships ?? {};

	if (relSchema.cardinality === "many") {
		updateOneToManyInverse(resource, parent, inverse);
	} else if (relSchema.cardinality === "one") {
		updateOneToOneInverse(resource, parent, inverse, context);
	}
}

/**
 * Merges a resource with an existing resource in the store.
 * Combines attributes and relationships from both resources.
 *
 * @param {import('@data-prism/core').CreateResource | import('@data-prism/core').UpdateResource} resource - The incoming resource
 * @param {import('@data-prism/core').NormalResource} existing - The existing resource in the store
 * @param {string} resultId - The ID to use for the merged resource
 * @returns {import('@data-prism/core').NormalResource} The merged resource
 */
function mergeWithExisting(resource, existing, resultId) {
	return {
		type: resource.type,
		id: resultId,
		attributes: { ...existing.attributes, ...resource.attributes },
		relationships: {
			...existing.relationships,
			...resource.relationships,
		},
	};
}

/**
 * Creates a new resource with default relationship structure.
 * Initializes empty arrays for many-cardinality relationships and null for one-cardinality.
 *
 * @param {import('@data-prism/core').CreateResource | import('@data-prism/core').UpdateResource} resource - The resource to create
 * @param {any} resSchema - The resource schema definition
 * @param {string} resultId - The ID to use for the new resource
 * @returns {import('@data-prism/core').NormalResource} The prepared new resource
 */
function createNewResource(resource, resSchema, resultId) {
	return {
		type: resource.type,
		id: resultId,
		attributes: resource.attributes ?? {},
		relationships: {
			...mapValues(resSchema.relationships, (r) =>
				r.cardinality === "one" ? null : [],
			),
			...resource.relationships,
		},
	};
}

/**
 * Prepares a resource for storage by determining whether to merge with existing or create new.
 * Generates a unique ID if none exists.
 *
 * @param {import('@data-prism/core').CreateResource | import('@data-prism/core').UpdateResource} resource - The resource to prepare
 * @param {import('@data-prism/core').NormalResource | null} existing - The existing resource (if any)
 * @param {any} resSchema - The resource schema definition
 * @returns {import('@data-prism/core').NormalResource} The prepared resource
 */
function prepareResourceForStorage(resource, existing, resSchema) {
	const resultId = resource.id ?? existing?.id ?? uuidv4();

	return resource.id
		? mergeWithExisting(resource, existing, resultId)
		: createNewResource(resource, resSchema, resultId);
}

/**
 * Normalizes resource references by extracting only type and id properties.
 *
 * @param {import('@data-prism/core').NormalResource} resource - The resource to normalize
 * @returns {import('@data-prism/core').NormalResource} The resource with normalized relationship references
 */
function normalizeResourceReferences(resource) {
	return {
		...resource,
		relationships: pick(resource.relationships, ["type", "id"]),
	};
}

/**
 * Updates a resource in the store graph, merging with existing data if present.
 *
 * WARNING: MUTATES storeGraph
 *
 * @param {import('@data-prism/core').NormalResource} resource - The normalized resource to store
 * @param {import('@data-prism/core').NormalResource | null} existing - The existing resource (if any)
 * @param {import('@data-prism/core').Graph} storeGraph - The graph data structure to update
 * @returns {void}
 */
function updateResourceInStore(resource, existing, storeGraph) {
	storeGraph[resource.type][resource.id] = existing
		? {
				...resource,
				attributes: { ...existing.attributes, ...resource.attributes },
				relationships: {
					...existing.relationships,
					...resource.relationships,
				},
			}
		: resource;
}

/**
 * Processes nested relationships within a resource, recursively handling sub-resources.
 * Updates the store graph with normalized relationship references.
 *
 * WARNING: MUTATES storeGraph
 *
 * @param {import('@data-prism/core').NormalResource} resource - The resource whose relationships to process
 * @param {any} resSchema - The resource schema definition
 * @param {Context} context - Context object containing schema, store, and storeGraph
 * @param {Function} processResourceTree - The recursive processing function
 * @returns {Object<string, any>} The processed relationships with full resource data
 */
function processNestedRelationships(
	resource,
	resSchema,
	context,
	processResourceTree,
) {
	const { storeGraph } = context;

	return mapValues(resource.relationships ?? {}, (rel, relName) => {
		const relSchema = resSchema.relationships[relName];
		const step = (relRes) =>
			relRes.attributes || relRes.relationships
				? processResourceTree(relRes, resource, relSchema, context)
				: relRes;

		const result = applyOrMap(rel, step);
		storeGraph[resource.type][resource.id].relationships[relName] = applyOrMap(
			result,
			(r) => ({ type: relSchema.type, id: r.id }),
		);

		return result;
	});
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

	// Handle inverse relationships
	handleInverseRelationships(resourceCopy, parent, parentRelSchema, context);

	// Prepare resource for storage
	const existing = store.getOne(resource.type, resource.id);
	const preparedResource = prepareResourceForStorage(
		resourceCopy,
		existing,
		resSchema,
	);

	// Normalize and update in store
	const normalizedResource = normalizeResourceReferences(preparedResource);
	updateResourceInStore(normalizedResource, existing, storeGraph);

	// Process nested relationships
	const processedRelationships = processNestedRelationships(
		preparedResource,
		resSchema,
		context,
		processResourceTree,
	);

	return { ...preparedResource, relationships: processedRelationships };
}

/**
 * Splices a resource tree into the store, creating or updating resources and their relationships.
 * Handles nested resources and maintains referential integrity through inverse relationship updates.
 *
 * WARNING: MUTATES storeGraph
 *
 * @param {import('@data-prism/core').CreateResource | import('@data-prism/core').UpdateResource} resourceTree - The resource tree to splice into the store
 * @param {Context} context - Context object containing schema, validator, store, and storeGraph
 * @returns {import('@data-prism/core').NormalResource} The processed resource tree with all nested resources created/updated
 */
export function splice(resourceTree, context) {
	const { schema, validator, store, storeGraph } = context;

	ensureValidSpliceResource(schema, resourceTree, { validator });

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

/*
// ORIGINAL IMPLEMENTATION (commented out)
export function splice(resourceTree, context) {
	const { schema, validator, store, storeGraph } = context;

	ensureValidSpliceResource(schema, resourceTree, { validator });

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

	const go = (res, parent = null, parentRelSchema = null) => {
		const resSchema = schema.resources[res.type];
		const resCopy = structuredClone(res);
		const inverse = parentRelSchema?.inverse;

		if (parent && inverse) {
			const relSchema = resSchema.relationships[inverse];
			resCopy.relationships = resCopy.relationships ?? {};
			if (
				relSchema.cardinality === "many" &&
				!(resCopy.relationships[inverse] ?? []).some((r) => r.id === res.id)
			) {
				resCopy.relationships[inverse] = [
					...(resCopy.relationships[inverse] ?? []),
					{ type: parent.type, id: parent.id },
				];
			} else if (relSchema.cardinality === "one") {
				const existing = store.getOne(parent.type, parent.id);
				const existingRef = existing?.relationships?.[inverse];

				if (existingRef && existingRef.id !== parent.id) {
					storeGraph[existing.type][existing.id] = {
						...existing,
						relationships: { ...existing.relationships, [inverse]: null },
					};
				}

				resCopy.relationships[inverse] = { type: parent.type, id: parent.id };
			}
		}

		const existing = store.getOne(res.type, res.id);
		const resultId = res.id ?? existing?.id ?? uuidv4();
		const prepped = res.id
			? {
					type: resCopy.type,
					id: resultId,
					attributes: { ...existing.attributes, ...resCopy.attributes },
					relationships: {
						...existing.relationships,
						...resCopy.relationships,
					},
				}
			: {
					type: resCopy.type,
					id: resultId,
					attributes: resCopy.attributes ?? {},
					relationships: {
						...mapValues(resSchema.relationships, (r) =>
							r.cardinality === "one" ? null : [],
						),
						...resCopy.relationships,
					},
				};

		const normalized = {
			...prepped,
			relationships: pick(prepped.relationships, ["type", "id"]),
		};

		storeGraph[res.type][resultId] = existing
			? {
					...normalized,
					attributes: { ...existing.attributes, ...normalized.attributes },
					relationships: {
						...existing.relationships,
						...normalized.relationships,
					},
				}
			: normalized;

		const preppedRels = mapValues(
			prepped.relationships ?? {},
			(rel, relName) => {
				const relSchema = resSchema.relationships[relName];
				const step = (relRes) =>
					relRes.attributes || relRes.relationships
						? go(relRes, prepped, relSchema)
						: relRes;

				const result = applyOrMap(rel, step);
				storeGraph[res.type][resultId].relationships[relName] = applyOrMap(
					result,
					(r) => ({ type: relSchema.type, id: r.id }),
				);

				return result;
			},
		);

		return { ...prepped, relationships: preppedRels };
	};

	return go(resourceTree, null, null);
}
*/
