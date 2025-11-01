import { mapValues, orderBy } from "es-toolkit";
import { defaultSelectEngine, defaultWhereEngine } from "../lib/defaults.js";
import { ID, RAW, TYPE } from "./query-graph.js";

const ITEMS = Symbol("group items");

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

	const groupClauses = {
		select(groups) {
			const { select } = query.group;
			const extractors = mapValues(select, (attrOrExpr, fieldName) =>
				typeof attrOrExpr === "string"
					? (group) => group[attrOrExpr]
					: (group) => selectEngine.apply(attrOrExpr, group),
			);

			return groups.map((group) => mapValues(extractors, (x) => x(group)));
		},
	};

	const clauses = {
		ids(results) {
			const idsSet = new Set(query.ids);
			return results.filter((result) => idsSet.has(result[ID]));
		},

		where(results) {
			if (Object.keys(query.where).length === 0) return results;
			return results.filter((result) => whereEngine.apply(query.where, result));
		},

		order(results) {
			const order = Array.isArray(query.order) ? query.order : [query.order];
			const properties = order.flatMap((o) => Object.keys(o));
			const dirs = order.flatMap((o) => Object.values(o));

			const first = results[0];
			if (first && properties.some((p) => !(p in first))) {
				const missing = properties.find((p) => !(p in first));
				throw new Error(
					`invalid "order" clause: '${missing} is not a valid attribute`,
				);
			}

			return orderBy(results, properties, dirs);
		},

		limit(results) {
			const { limit, offset = 0 } = query;
			if (limit < 1) throw new Error("`limit` must be at least 1");

			return results.slice(offset, limit + offset);
		},

		offset(results) {
			if (query.offset < 0) throw new Error("`offset` must be at least 0");
			return query.limit ? results : results.slice(query.offset);
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
			const { by } = query.group;
			const groupMap = new Map();

			// Group the results
			for (const result of results) {
				// Create group key from groupBy fields
				const groupKey = by.map((field) => result[field]).join("\0");

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

			// Apply each group clause
			return Object.entries(groupClauses).reduce(
				(result, [clauseName, fn]) =>
					clauseName in query.group ? fn(result) : result,
				groups,
			);
		},
	};

	return clauses;
}
