import { validateResourceTree } from "@data-prism/core";
import { upsertForeignRelationshipRows, upsertResourceRow } from "./upsert.js";

/**
 * @typedef {import('data-prism').Ref} Ref
 * @typedef {import('data-prism').NormalResourceTree} NormalResourceTree
 * @typedef {import('./postgres-store.js').Context} Context
 * @typedef {import('./postgres-store.js').PostgresStore} PostgresStore
 */

/**
 * @typedef {Context & {store: PostgresStore, validator: Ajv}} ExtendedContext
 */

/**
 * Splices (upserts) a resource tree into the database with transaction support
 * @param {NormalResourceTree} resource - The resource tree to splice
 * @param {ExtendedContext} context - Extended context with store and validator
 * @returns {Promise<NormalResourceTree>} The spliced resource tree
 */
export async function splice(resource, context) {
	const { config, schema, validator } = context;
	const { db } = config;

	const errors = validateResourceTree(schema, resource, validator);
	if (errors.length > 0) {
		throw new Error("invalid resource tree", { cause: errors });
	}

	/**
	 * Recursively processes a resource or reference
	 * @param {NormalResourceTree|Ref} res - The resource to process
	 * @returns {Promise<NormalResourceTree>} The processed resource
	 */
	const go = async (res) => {
		if (!("attributes" in res) && !("relationships" in res)) return res;

		const upserted = await upsertResourceRow(res, context);

		const processedRelationships = {};
		await Promise.all(
			Object.entries(res.relationships ?? {}).map(async ([relName, relVal]) => {
				if (Array.isArray(relVal)) {
					const processed = await Promise.all(relVal.map(go));
					processedRelationships[relName] = await Promise.all(
						processed.map((p) => upsertForeignRelationshipRows(p, context)),
					);
				} else {
					const processed = await go(relVal);
					processedRelationships[relName] = upsertForeignRelationshipRows(
						processed,
						context,
					);
				}
			}),
		);

		return {
			type: res.type,
			id: upserted.id,
			attributes: res.attributes,
			...(res.relationships ? { relationships: processedRelationships } : {}),
		};
	};

	try {
		await db.query("BEGIN");
		const output = await go(resource);
		await db.query("COMMIT");
		return output;
	} catch (err) {
		await db.query("ROLLBACK");
		throw err;
	}
}

// const getExpectedExistingRefs = (res: NormalResourceTree): Ref[] => {
// 	const related = Object.values(res.relationships ?? {}).flatMap((rel) =>
// 		rel
// 			? Array.isArray(rel)
// 				? rel.flatMap((r) =>
// 						("attributes" in r || "relationships" in r) && "id" in r
// 							? getExpectedExistingRefs(r as NormalResourceTree)
// 							: (rel as unknown as Ref),
// 					)
// 				: "attributes" in rel || "relationships" in rel
// 					? getExpectedExistingRefs(rel as NormalResourceTree)
// 					: (rel as unknown as Ref)
// 			: null,
// 	);

// 	return res.new || !res.id
// 		? related
// 		: [{ type: res.type, id: res.id }, ...related];
// };

// const expectedExistingRefs = getExpectedExistingRefs(resource);
// const expectedByType = groupBy(expectedExistingRefs, (r) => r.type);

// // ensure the outgoing refs are valid
// await (
// 	await Promise.all(Object.entries(expectedByType))
// ).forEach(async ([type, refs]) => {
// 	const { idAttribute = "id" } = schema.resources[type];
// 	const { table } = config.resources[type];

// 	const ress = await db.query(
// 		`SELECT ${idAttribute} FROM ${table} WHERE ${idAttribute} = ANY($1)`,
// 		[refs.map((r) => r.id)],
// 	);

// 	if (ress.rowCount !== refs.length) {
// 		const existing = new Set(ress.rows.map((r) => r[idAttribute]));
// 		const missing = refs.find((ref) => !existing.has(ref.id));
// 		throw new Error(
// 			`expected { type: "${missing.type}", id: "${missing.id}" } to already exist in the graph`,
// 		);
// 	}
// });

// const missing = expectedExistingResources(resource)
// 	.filter((ref) => ref && ref.id)
// 	.find(({ type, id }) => !store.getOne(type, id));

// if (missing) {
// 	throw new Error(
// 		`expected { type: "${missing.type}", id: "${missing.id}" } to already exist in the graph`,
// 	);
// }
