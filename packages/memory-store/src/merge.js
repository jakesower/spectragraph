import { mapValues } from "es-toolkit";
import { applyOrMap } from "@spectragraph/utils";
import { create as createAction } from "./create.js";
import { update as updateAction } from "./update.js";
import { ensureValidMergeResource } from "@spectragraph/core";

/**
 * @typedef {import("@spectragraph/core").CreateResource | import("@spectragraph/core").UpdateResource} UpsertResource
 */

/**
 * Handles merge operations for memory store
 * @param {UpsertResource|UpsertResource[]} resourceTreeOrTrees - Single resource or array of resources
 * @param {import('./memory-store.js').MemoryStoreContext} context - Store context
 * @returns {import('@spectragraph/core').NormalResource|import('@spectragraph/core').NormalResource[]} The processed resource(s)
 */
export function merge(resourceTreeOrTrees, context) {
	const isArray = Array.isArray(resourceTreeOrTrees);
	const resourceTrees = isArray ? resourceTreeOrTrees : [resourceTreeOrTrees];

	const go = (resource) => {
		ensureValidMergeResource(context.schema, resource, context);

		const processedRels = mapValues(resource.relationships ?? {}, (relOrRels) =>
			applyOrMap(relOrRels, (rel) => {
				return rel.attributes || rel.relationships ? go(rel) : rel;
			}),
		);

		const withProcessedRels = {
			...resource,
			relationships: processedRels,
		};

		return resource.id
			? updateAction(withProcessedRels, context)
			: createAction(withProcessedRels, context);
	};

	const result = resourceTrees.map(go);
	return isArray ? result : result[0];
}
