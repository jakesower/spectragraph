/**
 * @typedef {import('@spectragraph/core').Schema} Schema
 * @typedef {import('@spectragraph/core').Graph} Graph
 * @typedef {import('@spectragraph/core').NormalResource} NormalResource
 * @typedef {import('@spectragraph/core').CreateResource} CreateResource
 * @typedef {import('@spectragraph/core').UpdateResource} UpdateResource
 * @typedef {import('@spectragraph/core').Ref} Ref
 */

import { mapValues } from "es-toolkit";

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

function removeRef(resource, ref, relName, context) {
	const { storeGraph } = context;
	const { type, id } = resource;

	const existing = resource.relationships[relName];
	if (!existing) return;

	if (Array.isArray(existing)) {
		// to-many
		storeGraph[type][id].relationships[relName] = storeGraph[type][
			id
		].relationships[relName].filter((r) => r.id !== ref.id);
	} else if (storeGraph[type][id].relationships[relName].id === ref.id) {
		storeGraph[type][id].relationships[relName] = null;
	}
}

function addOrSetRef(resource, ref, relName, context) {
	const { schema, storeGraph } = context;
	const { type, id } = resource;

	const existing = storeGraph[type][id].relationships[relName];

	if (Array.isArray(existing)) {
		// to-many
		storeGraph[type][id].relationships[relName] = existing.some(
			(e) => e.id === ref.id,
		)
			? existing
			: [...existing, ref];
	} else {
		const original = storeGraph[type][id].relationships[relName];
		storeGraph[type][id].relationships[relName] = ref;

		// cascade
		if (original) {
			const { inverse } =
				schema.resources[resource.type].relationships[relName];
			removeRef(
				storeGraph[original.type][original.id],
				resource,
				inverse,
				context,
			);
		}
	}
}

export function setInversesOnRelationship(
	resource,
	newRefOrRefs,
	relationshipName,
	context,
) {
	const { schema, storeGraph } = context;

	const resSchema = schema.resources[resource.type];
	const relSchema = resSchema.relationships[relationshipName];
	const foreignType = relSchema.type;
	const foreignRelName = relSchema.inverse;
	const resourceRef = { type: resource.type, id: resource.id };

	if (!foreignRelName) return;

	if (relSchema.cardinality === "one") {
		const oldRef = resource.relationships[relationshipName];
		if (oldRef) {
			const foreignRes = storeGraph[foreignType][oldRef.id];
			removeRef(foreignRes, resourceRef, foreignRelName, context);
		}

		if (newRefOrRefs) {
			const foreignRes = storeGraph[foreignType][newRefOrRefs.id];
			addOrSetRef(foreignRes, resourceRef, foreignRelName, context);
		}
	} else {
		const existingRel = resource.relationships[relationshipName];
		const existingArray = Array.isArray(existingRel)
			? existingRel
			: existingRel
				? [existingRel]
				: [];
		const existingIds = new Set(existingArray.map((r) => r.id));

		const incomingArray = Array.isArray(newRefOrRefs)
			? newRefOrRefs
			: newRefOrRefs
				? [newRefOrRefs]
				: [];
		const incomingIds = new Set(incomingArray.map((r) => r.id));

		[...existingIds.difference(incomingIds)].forEach((id) => {
			removeRef(
				storeGraph[foreignType][id],
				resourceRef,
				relSchema.inverse,
				context,
			);
		});

		[...incomingIds.difference(existingIds)].forEach((id) => {
			const foreignRes = storeGraph[foreignType][id];
			if (foreignRes) {
				addOrSetRef(foreignRes, resourceRef, relSchema.inverse, context);
			}
		});
	}
}

export function setInverseRelationships(oldResource, newResource, context) {
	const resSchema = context.schema.resources[oldResource.type];

	mapValues(resSchema.relationships, (_, relName) => {
		setInversesOnRelationship(
			oldResource,
			newResource.relationships[relName],
			relName,
			context,
		);
	});
}
