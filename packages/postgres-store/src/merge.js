import { applyOrMap, promiseObjectAll } from "@spectragraph/utils";
import { mapValues } from "es-toolkit";
import { create } from "./create.js";
import { update } from "./update.js";

/**
 * @typedef {import("./postgres-store.js").CreateResource | import("./postgres-store.js").UpdateResource} UpsertResource
 */

/**
 * Handles merge operations for PostgreSQL store
 * @param {UpsertResource|UpsertResource[]} resourceTreeOrTrees - Single resource or array of resources
 * @param {import('./postgres-store.js').Context & {client: import('pg').PoolClient}} context - Store context with database client
 * @returns {Promise<import('./postgres-store.js').Resource|import('./postgres-store.js').Resource[]>}
 */
export async function merge(resourceTreeOrTrees, context) {
	const isArray = Array.isArray(resourceTreeOrTrees);
	const resourceTrees = isArray ? resourceTreeOrTrees : [resourceTreeOrTrees];

	const go = async (resource) => {
		const processedRels = await promiseObjectAll(
			mapValues(resource.relationships ?? {}, (relOrRels) =>
				applyOrMap(relOrRels, (rel) => {
					return rel.attributes || rel.relationships ? go(rel) : rel;
				}),
			),
		);

		const withProcessedRels = {
			...resource,
			relationships: processedRels,
		};

		return resource.id
			? update(withProcessedRels, context)
			: create(withProcessedRels, context);
	};

	const result = await Promise.all(applyOrMap(resourceTrees, go));
	return isArray ? result : result[0];
}
