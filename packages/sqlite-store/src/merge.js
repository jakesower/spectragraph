import { applyOrMap, promiseObjectAll } from "@data-prism/utils";
import { create } from "./create.js";
import { update } from "./update.js";
import { mapValues } from "es-toolkit";

/**
 * @typedef {import("./sqlite-store.js").CreateResource | import("./sqlite-store.js").UpdateResource} UpsertResource
 */

/**
 * Handles merge operations for SQLite store
 * @param {UpsertResource|UpsertResource[]} resourceTreeOrTrees - Single resource or array of resources
 * @param {import('./sqlite-store.js').Context} context - Store context
 * @returns {Promise<import('./sqlite-store.js').Resource|import('./sqlite-store.js').Resource[]>}
 */
export async function merge(resourceTreeOrTrees, context) {
	const { db, schema } = context;
	const isArray = Array.isArray(resourceTreeOrTrees);
	const resourceTrees = isArray ? resourceTreeOrTrees : [resourceTreeOrTrees];

	// const expectedToBeCreated = mapValues(schema.resources, () => new Set());
	// const created = mapValues(schema.resources, () => new Set());

	db.prepare("BEGIN").run();
	try {
		const go = async (resource) => {
			const processedRels = await promiseObjectAll(
				mapValues(resource.relationships ?? {}, (relOrRels) =>
					applyOrMap(relOrRels, (rel) => {
						return rel.attributes || rel.relationships ? go(rel) : rel;
					}),
				),
			);

			const processed = resource.id
				? await update(resource, context)
				: await create(resource, context);

			return {
				...processed,
				relationships: processedRels,
			};
		};

		const result = await Promise.all(applyOrMap(resourceTrees, go));
		db.prepare("COMMIT").run();
		return isArray ? result : result[0];
	} catch (error) {
		db.prepare("ROLLBACK").run();
		throw error;
	}
}
