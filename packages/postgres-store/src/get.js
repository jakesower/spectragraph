import { mapValues, snakeCase } from "lodash-es";
import { columnTypeModifiers } from "./column-type-modifiers.js";

/**
 * @typedef {import('./postgres-store.js').Context} Context
 * @typedef {import('./postgres-store.js').Resource} Resource
 * @typedef {import('./postgres-store.js').LocalJoin} LocalJoin
 * @typedef {import('./postgres-store.js').ForeignJoin} ForeignJoin
 * @typedef {import('./postgres-store.js').ManyToManyJoin} ManyToManyJoin
 */

/**
 * @typedef {Object} GetOptions
 * @property {boolean} [includeRelationships]
 */

/**
 * @typedef {Context & {options: GetOptions}} GetContext
 */

/**
 * Gets a single resource by type and ID
 * @param {string} type - Resource type
 * @param {string} id - Resource ID
 * @param {GetContext} context - Get context with config, schema, and options
 * @returns {Promise<Resource>} The resource
 */
export async function getOne(type, id, context) {
	const { config, options = {}, schema } = context;
	const { includeRelationships = true } = options;
	const { db } = config;

	const resConfig = config.resources[type];
	const { joins, table } = resConfig;

	const resSchema = schema.resources[type];
	const { idAttribute = "id" } = resSchema;
	const attrNames = Object.keys(resSchema.attributes);

	const output = { type, id, attributes: {}, relationships: {} };

	/** @type {Array<[string, LocalJoin]>} */
	const localRelationships = Object.entries(joins).filter(
		([_, j]) => "localColumn" in j,
	);
	/** @type {Array<[string, ForeignJoin]>} */
	const foreignRelationships = Object.entries(joins).filter(
		([_, j]) => "foreignColumn" in j,
	);
	/** @type {Array<[string, ManyToManyJoin]>} */
	const manyToManyRelationships = Object.entries(joins).filter(
		([_, j]) => "localJoinColumn" in j,
	);

	const foreignQueries = includeRelationships
		? [
				...foreignRelationships.map(async ([joinName, joinInfo]) => {
					const { foreignColumn } = joinInfo;
					const relSchema = resSchema.relationships[joinName];
					const relResSchema = schema.resources[relSchema.type];
					const relConfig = config.resources[relSchema.type];
					const foreignTable = relConfig.table;
					const foreignId = snakeCase(relResSchema.idAttribute ?? "id");

					const { rows } = await db.query(
						{
							rowMode: "array",
							text: `SELECT ${foreignId} FROM ${foreignTable} WHERE ${foreignColumn} = $1`,
						},
						[id],
					);

					output.relationships[joinName] =
						relSchema.cardinality === "one"
							? rows[0]
								? { type: relSchema.type, id: rows[0][0] }
								: null
							: rows.map((r) => ({ type: relSchema.type, id: r[0] }));
				}),
				...manyToManyRelationships.map(async ([joinName, joinInfo]) => {
					const { foreignJoinColumn, joinTable, localJoinColumn } = joinInfo;
					const relSchema = resSchema.relationships[joinName];

					const { rows } = await db.query(
						{
							rowMode: "array",
							text: `SELECT ${foreignJoinColumn} FROM ${joinTable} WHERE ${localJoinColumn} = $1`,
						},
						[id],
					);

					output.relationships[joinName] = rows.map((r) => ({
						type: relSchema.type,
						id: r[0],
					}));
				}),
			]
		: [];

	const cols = [
		...attrNames.map((attrName) =>
			columnTypeModifiers[resSchema.attributes[attrName].type]
				? columnTypeModifiers[resSchema.attributes[attrName].type].select(
						snakeCase(attrName),
					)
				: snakeCase(attrName),
		),
		...localRelationships.map(([_, r]) => snakeCase(r.localColumn)),
	].join(", ");
	const localQuery = db.query(
		{
			rowMode: "array",
			text: `SELECT ${cols} FROM ${table} WHERE ${snakeCase(idAttribute)} = $1`,
		},
		[id],
	);

	const [localResult] = await Promise.all([localQuery, ...foreignQueries]);

	const { rows } = localResult;
	const row = rows[0];
	if (!row) return null;

	attrNames.forEach((attr, idx) => {
		const attrType = resSchema.attributes[attr].type;

		output.attributes[attr] =
			typeof row[idx] === "string" && columnTypeModifiers[attrType]
				? columnTypeModifiers[attrType].extract(row[idx])
				: row[idx];
	});

	if (includeRelationships) {
		localRelationships.forEach(([relName], idx) => {
			const id = row[idx + attrNames.length];
			output.relationships[relName] = id
				? {
						type: resSchema.relationships[relName].type,
						id,
					}
				: null;
		});
	}

	return output;
}

/**
 * Gets all resources of a given type
 * @param {string} type - Resource type
 * @param {GetContext} context - Get context with config, schema, and options
 * @returns {Promise<Resource[]>} Array of resources
 */
export async function getAll(type, context) {
	const { config, options = {}, schema } = context;
	const { includeRelationships = true } = options;
	const { db } = config;

	const resConfig = config.resources[type];
	const { joins, table } = resConfig;

	const resSchema = schema.resources[type];
	const attrNames = Object.keys(resSchema.attributes);

	const resources = {};

	/** @type {Array<[string, LocalJoin]>} */
	const localRelationships = Object.entries(joins).filter(
		([_, j]) => "localColumn" in j,
	);

	const cols = [
		snakeCase(resSchema.idAttribute ?? "id"),
		...attrNames.map((attrName) =>
			columnTypeModifiers[resSchema.attributes[attrName].type]
				? columnTypeModifiers[resSchema.attributes[attrName].type].select(
						snakeCase(attrName),
					)
				: snakeCase(attrName),
		),
		...localRelationships.map(([_, r]) => snakeCase(r.localColumn)),
	].join(", ");
	const localQuery = db.query({
		rowMode: "array",
		text: `SELECT ${cols} FROM ${table}`,
	});

	const { rows } = await localQuery;

	rows.forEach((row) => {
		/** @type {any} */
		const resource = { type, id: row[0], attributes: {} };
		if (includeRelationships) {
			resource.relationships = mapValues(resSchema.relationships, (rel) =>
				rel.cardinality === "one" ? null : [],
			);
		}

		attrNames.forEach((attr, idx) => {
			const attrType = resSchema.attributes[attr].type;

			resource.attributes[attr] =
				typeof row[idx + 1] === "string" && columnTypeModifiers[attrType]
					? columnTypeModifiers[attrType].extract(row[idx + 1])
					: row[idx + 1];
		});

		if (includeRelationships) {
			localRelationships.forEach(([relName], idx) => {
				const id = row[idx + attrNames.length + 1];
				resource.relationships[relName] = id
					? {
							type: resSchema.relationships[relName].type,
							id,
						}
					: null;
			});
		}

		resources[resource.id] = resource;
	});

	if (includeRelationships) {
		/** @type {Array<[string, ForeignJoin]>} */
		const foreignRelationships = Object.entries(joins).filter(
			([_, j]) => "foreignColumn" in j,
		);
		/** @type {Array<[string, ManyToManyJoin]>} */
		const manyToManyRelationships = Object.entries(joins).filter(
			([_, j]) => "localJoinColumn" in j,
		);

		const foreignQueries = [
			...foreignRelationships.map(async ([joinName, joinInfo]) => {
				const { foreignColumn } = joinInfo;
				const relSchema = resSchema.relationships[joinName];
				const relResSchema = schema.resources[relSchema.type];
				const relConfig = config.resources[relSchema.type];
				const foreignTable = relConfig.table;
				const foreignId = snakeCase(relResSchema.idAttribute ?? "id");

				const { rows } = await db.query({
					rowMode: "array",
					text: `SELECT ${foreignColumn}, ${foreignId} FROM ${foreignTable} WHERE ${foreignColumn} IS NOT NULL`,
				});

				rows.forEach((row) => {
					const resource = resources[row[0]];

					if (relSchema.cardinality === "one") {
						resource.relationships[joinName] = {
							type: relSchema.type,
							id: row[1],
						};
					} else {
						resource.relationships[joinName].push({
							type: relSchema.type,
							id: row[1],
						});
					}
				});
			}),
			...manyToManyRelationships.map(async ([joinName, joinInfo]) => {
				const { foreignJoinColumn, joinTable, localJoinColumn } = joinInfo;
				const relSchema = resSchema.relationships[joinName];

				const { rows } = await db.query({
					rowMode: "array",
					text: `SELECT ${localJoinColumn}, ${foreignJoinColumn} FROM ${joinTable} WHERE ${localJoinColumn} IS NOT NULL`,
				});

				rows.forEach((row) => {
					const resource = resources[row[0]];

					resource.relationships[joinName].push({
						type: relSchema.type,
						id: row[1],
					});
				});
			}),
		];

		await Promise.all([...foreignQueries]);
	}

	return Object.values(resources);
}