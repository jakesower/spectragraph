/**
 * @typedef {import('@data-prism/core').Schema} Schema
 * @typedef {import('@data-prism/core').Graph} Graph
 * @typedef {import('@data-prism/core').NormalResource} NormalResource
 * @typedef {import('@data-prism/core').CreateResource} CreateResource
 * @typedef {import('@data-prism/core').UpdateResource} UpdateResource
 * @typedef {import('@data-prism/core').Ref} Ref
 */

/**
 * @typedef {'one' | 'many'} RelationshipCardinality
 */

/**
 * @typedef {Object} RelationshipSchema
 * @property {string} type - The target resource type
 * @property {RelationshipCardinality} cardinality - Whether the relationship is to-one or to-many
 * @property {string} [inverse] - The name of the inverse relationship on the target resource
 */

/**
 * @typedef {Object} ResourceSchema
 * @property {Object<string, RelationshipSchema>} relationships - Map of relationship names to their schemas
 */

/**
 * @typedef {Object} RelationshipUpdateContext
 * @property {Schema} schema - The complete schema definition
 * @property {Graph} storeGraph - The graph data structure being modified
 */

/**
 * Updates all inverse relationships for a single relationship on a resource.
 * Handles both one-to-one and one-to-many cardinalities appropriately.
 *
 * WARNING: MUTATES storeGraph
 *
 * @param {NormalResource} sourceRes - The resource whose relationship is being updated
 * @param {string} relName - Name of the relationship being updated
 * @param {Ref | Ref[] | null} relValue - The new relationship value
 * @param {RelationshipUpdateContext} context - Context containing schema and storeGraph
 */
export function updateInverseRelationships(
	sourceRes,
	relName,
	relValue,
	context,
) {
	const { schema, storeGraph } = context;
	const sourceResSchema = schema.resources[sourceRes.type];
	const relationshipSchema = sourceResSchema.relationships[relName];

	// Skip if no inverse relationship is defined
	if (!relationshipSchema?.inverse) return;

	const { inverse: inverseRelName, type: targetType } = relationshipSchema;
	const targetResourceSchema = schema.resources[targetType];
	const inverseRelationshipSchema =
		targetResourceSchema.relationships[inverseRelName];

	const targetRefs =
		relValue === null ? [] : Array.isArray(relValue) ? relValue : [relValue];

	if (inverseRelationshipSchema.cardinality === "one") {
		// Handle one-to-one relationships
		targetRefs.forEach((targetRef) => {
			const targetResource = storeGraph[targetRef.type][targetRef.id];
			const currentInverseRef = targetResource.relationships[inverseRelName];

			// Clean up previous relationship if target resource had a different inverse reference
			if (currentInverseRef && currentInverseRef.id !== sourceRes.id) {
				const previousResource =
					storeGraph[currentInverseRef.type][currentInverseRef.id];
				if (previousResource) {
					// Remove the target from the previous resource's relationship
					if (relationshipSchema.cardinality === "one") {
						previousResource.relationships[relName] = null;
					} else {
						// For many-cardinality, filter out the target reference
						const currentRefs = previousResource.relationships[relName] || [];
						previousResource.relationships[relName] = currentRefs.filter(
							(ref) => ref.id !== targetRef.id,
						);
					}
				}
			}

			// Set the new inverse reference
			targetResource.relationships[inverseRelName] = {
				type: sourceRes.type,
				id: sourceRes.id,
			};
		});
	} else {
		// Handle one-to-many relationships
		targetRefs.forEach((targetRef) => {
			const targetResource = storeGraph[targetRef.type][targetRef.id];
			const currentInverseRefs =
				targetResource.relationships[inverseRelName] || [];

			// Check if source is already referenced to avoid duplicates
			const isAlreadyReferenced = currentInverseRefs.some(
				(ref) => ref.id === sourceRes.id,
			);

			if (!isAlreadyReferenced) {
				targetResource.relationships[inverseRelName] = [
					...currentInverseRefs,
					{ type: sourceRes.type, id: sourceRes.id },
				];
			}
		});
	}
}

/**
 * Updates all inverse relationships for a resource by processing each relationship.
 * This is a convenience function that iterates over all relationships on a resource.
 *
 * WARNING: MUTATES storeGraph
 *
 * @param {NormalResource} resource - The resource whose relationships need inverse updates
 * @param {RelationshipUpdateContext} context - Context containing schema and storeGraph
 */
export function updateAllInverseRelationships(resource, context) {
	if (!resource.relationships) return;

	Object.entries(resource.relationships).forEach(([relName, relValue]) => {
		updateInverseRelationships(resource, relName, relValue, context);
	});
}

/**
 * Cleans up inverse relationships when a resource is being deleted.
 * Removes references to the deleted resource from all related resources.
 *
 * WARNING: MUTATES storeGraph
 *
 * @param {NormalResource} deletedRes - The resource being deleted
 * @param {RelationshipUpdateContext} context - Context containing schema and storeGraph
 */
export function cleanupInverseRelationships(deletedRes, context) {
	const { schema, storeGraph } = context;
	const resourceSchema = schema.resources[deletedRes.type];

	if (!deletedRes.relationships) return;

	Object.entries(deletedRes.relationships).forEach(([relName, relValue]) => {
		const relationshipSchema = resourceSchema.relationships[relName];

		if (!relationshipSchema?.inverse) {
			return;
		}

		const { inverse: inverseRelName, type: targetType } = relationshipSchema;
		const targetResourceSchema = schema.resources[targetType];
		const inverseRelationshipSchema =
			targetResourceSchema.relationships[inverseRelName];

		const targetRefs =
			relValue === null ? [] : Array.isArray(relValue) ? relValue : [relValue];

		targetRefs.forEach((targetRef) => {
			const targetResource = storeGraph[targetRef.type][targetRef.id];
			if (!targetResource) {
				return;
			}

			if (inverseRelationshipSchema.cardinality === "one") {
				targetResource.relationships[inverseRelName] = null;
			} else {
				const currentRefs = targetResource.relationships[inverseRelName] || [];
				targetResource.relationships[inverseRelName] = currentRefs.filter(
					(ref) => ref.id !== deletedRes.id,
				);
			}
		});
	});
}
