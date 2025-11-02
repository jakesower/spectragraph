import { mapValues, orderBy } from "es-toolkit";
import { defaultSelectEngine, defaultWhereEngine } from "../lib/defaults.js";
import { ID, RAW, TYPE } from "./query-graph.js";

const ITEMS = Symbol("group items");

// NOTE: The order of definition of clauses is CRITICAL for proper functioning.
// For example, if limit/offset were switched it would break.

function createGroupQueryGraphClauses(query, options = {}) {
	const { whereEngine = defaultWhereEngine } = options;

	const { group } = query;
	const { limit, offset, order, where } = group;

	const columns = [
		...Object.keys(group.select ?? {}),
		...Object.keys(group.aggregates ?? {}),
	];
	const columnsSet = new Set(columns);

	const clauses = {
		where(results) {
			return results.filter((result) => whereEngine.apply(where, result));
		},
		order(results) {
			const properties = order.flatMap((o) => Object.keys(o));
			const dirs = order.flatMap((o) => Object.values(o));

			const invalidProp = properties.find((p) => !columnsSet.has(p));
			if (invalidProp) {
				throw new Error(
					`invalid group "order" clause: '${invalidProp}' is not a valid field from "groups.select" or "groups.aggregates"`,
				);
			}

			return orderBy(results, properties, dirs);
		},
		offset(result) {
			return result.slice(offset);
		},
		limit(result) {
			return result.slice(0, limit);
		},
	};

	return clauses;
}

export function createQueryGraphClauses(
	schema,
	query,
	processSubquery,
	options = {},
) {
	const {
		selectEngine = defaultSelectEngine,
		whereEngine = defaultWhereEngine,
	} = options;

	const resSchema = schema.resources[query.type];
	const { limit, offset } = query;

	const clauses = {
		ids(results) {
			const idsSet = new Set(query.ids);
			return results.filter((result) => idsSet.has(result[ID]));
		},

		where(results) {
			return results.filter((result) => whereEngine.apply(query.where, result));
		},

		order(results) {
			const order = Array.isArray(query.order) ? query.order : [query.order];
			const properties = order.flatMap((o) => Object.keys(o));
			const dirs = order.flatMap((o) => Object.values(o));

			// Validate against schema
			const invalidProp = properties.find((p) => !(p in resSchema.attributes));
			if (invalidProp) {
				throw new Error(
					`invalid "order" clause: '${invalidProp}' is not a valid attribute`,
				);
			}

			return orderBy(results, properties, dirs);
		},

		offset(result) {
			return result.slice(offset);
		},

		limit(result) {
			return result.slice(0, limit);
		},

		select(results) {
			const { select } = query;

			if (!select) return results;
			const projectors = mapValues(select, (propQuery, propName) => {
				// possibilities: (1) property (2) expression (3) subquery
				if (typeof propQuery === "string") {
					// nested / shallow property
					return (result) =>
						propQuery in result[RAW].relationships
							? result[RAW].relationships[propQuery]
							: selectEngine.apply({ $get: propQuery }, result);
				}

				// expression
				if (selectEngine.isExpression(propQuery)) {
					return (result) => selectEngine.apply(propQuery, result);
				}

				// subquery
				if (!(propName in resSchema.relationships)) {
					throw new Error(
						`The "${propName}" relationship is undefined on a resource of type "${query.type}". You probably have an invalid schema or constructed your graph wrong. Check that the resources have "inverse" set in the schema try linking the inverses (via "linkInverses"), check your schema to make sure all inverses have been defined correctly there, and make sure all resources have been loaded into the graph.`,
					);
				}

				const relSchema = resSchema.relationships[propName];

				// to-one relationship
				if (relSchema.cardinality === "one") {
					return (result) => {
						if (Array.isArray(result[propName])) {
							throw new Error(
								`${query.type}.${query.id} contains an array for the to-one relationship "${propName}" which should be an object instead`,
							);
						}

						if (result[propName] === undefined) {
							throw new Error(
								`A related resource was not found on resource ${query.type}.${
									query.id
								}. ${propName}: ${JSON.stringify(
									result[RAW].relationships[propName],
								)}. Check that all of the relationship refs in ${query.type}.${
									query.id
								} are valid.`,
							);
						}

						if (result[propName] === null) return null;

						return processSubquery({
							...propQuery,
							type: result[propName][TYPE],
							id: result[propName][ID],
						});
					};
				}

				// to-many relationship
				return (result) => {
					if (!Array.isArray(result[propName])) {
						throw new Error(
							`${query.type}.${query.id} does not contain array for the to-many relationship "${propName}". This should be an array of objects. A common reason for this is that an inverse hasn't been set in the schema or "linkInverses" was not called.`,
						);
					}

					return result[propName]
						.map((r) => {
							if (r === undefined) {
								throw new Error(
									`A related resource was not found on resource ${
										query.type
									}.${query.id}.${propName}. Check that all of the relationship refs in ${
										query.type
									}.${query.id} are valid.`,
								);
							}

							return processSubquery({
								...propQuery,
								type: r[TYPE],
								id: r[ID],
							});
						})
						.filter(Boolean);
				};
			});

			return results.map((result) =>
				mapValues(projectors, (project) => project(result)),
			);
		},

		group(results) {
			const { aggregates, by, select } = query.group;
			const groupMap = new Map();

			// Group the results
			for (const result of results) {
				// Create group key from groupBy fields
				const groupKey = JSON.stringify(by.map((field) => result[field]));

				if (!groupMap.has(groupKey)) {
					// Create group entry with key values and empty collection
					const groupEntry = {};
					by.forEach((field) => {
						groupEntry[field] = result[field];
					});
					Object.defineProperty(groupEntry, ITEMS, {
						value: [],
						enumerable: false,
						writable: false,
						configurable: false,
					});
					groupMap.set(groupKey, groupEntry);
				}

				groupMap.get(groupKey)[ITEMS].push(result);
			}

			// Convert to array
			const groups = Array.from(groupMap.values());

			// Build extractors, then execute them
			const selectExtractors = mapValues(select ?? {}, (attrOrExpr) =>
				typeof attrOrExpr === "string"
					? (group) => group[attrOrExpr]
					: (group) => selectEngine.apply(attrOrExpr, group),
			);

			const aggregateExtractors = mapValues(
				aggregates ?? {},
				(expr) => (group) => selectEngine.apply(expr, group[ITEMS]),
			);

			const extractors = { ...selectExtractors, ...aggregateExtractors };
			const extracted = groups.map((group) =>
				mapValues(extractors, (x) => x(group)),
			);

			const groupClauses = createGroupQueryGraphClauses(query, options);
			const processed = Object.entries(groupClauses).reduce(
				(acc, [opName, fn]) => (opName in query.group ? fn(acc) : acc),
				extracted,
			);

			return processed;
		},
	};

	return clauses;
}
