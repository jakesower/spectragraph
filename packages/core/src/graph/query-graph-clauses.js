import { mapValues, orderBy } from "es-toolkit";
import { get } from "@spectragraph/utils";
import { defaultSelectEngine, defaultWhereEngine } from "../lib/defaults.js";
import { ID, RAW, TYPE } from "./query-graph.js";

const ITEMS = Symbol("group items");

/**
 * Tuple comparison for before/after slice anchors.
 *
 * For `after` with asc: row passes if tuple(row) > tuple(anchor)
 * For `before` with asc: row passes if tuple(row) < tuple(anchor)
 * Direction flips per-key based on the sort direction.
 *
 * Lexicographic: (a,b) > (x,y) means a > x OR (a === x AND b > y)
 */
function tupleCompare(query, anchor, row, mode) {
	const { order } = query;

	for (let i = 0; i < order.length; i += 1) {
		const [key, dir] = Object.entries(order[i])[0];
		const anchorVal = anchor[key];
		const rowVal = row[key];

		// Determine which comparison means "later in sort order"
		const gt = dir === "asc" ? rowVal > anchorVal : rowVal < anchorVal;
		const lt = dir === "asc" ? rowVal < anchorVal : rowVal > anchorVal;

		if (mode === "after" && gt) return true;
		if (mode === "after" && lt) return false;
		if (mode === "before" && lt) return true;
		if (mode === "before" && gt) return false;
		// equal on this key — continue to next key
	}

	// All keys equal — exclusive, so exclude
	return false;
}

// NOTE: The order of definition of clauses is CRITICAL for proper functioning.
// For example, if limit/offset were switched it would break.

function createGroupQueryGraphClauses(groupQuery, options = {}) {
	const { whereEngine = defaultWhereEngine } = options;

	const { order, where } = groupQuery;
	const { limit, offset, before, after } = groupQuery.slice ?? {};
	const reverseSlice = before && !after;

	const clauses = {
		where(results) {
			return results.filter((result) => whereEngine.apply(where, result));
		},
		order(results) {
			const properties = order.flatMap((o) => Object.keys(o));
			const dirs = order.flatMap((o) => Object.values(o));

			return orderBy(results, properties, dirs);
		},
		after(results) {
			return results.filter((result) =>
				tupleCompare(groupQuery, after, result, "after"),
			);
		},
		before(results) {
			return results.filter((result) =>
				tupleCompare(groupQuery, before, result, "before"),
			);
		},
		offset(result) {
			if (reverseSlice) {
				return offset ? result.slice(0, -offset) : result;
			}
			return result.slice(offset);
		},
		limit(result) {
			if (reverseSlice) {
				return result.slice(-limit);
			}
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
	const { limit, offset, before, after } = query.slice ?? {};
	const reverseSlice = before && !after;

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

			return orderBy(results, properties, dirs);
		},

		after(results) {
			return results.filter((result) =>
				tupleCompare(query, after, result, "after"),
			);
		},

		before(results) {
			return results.filter((result) =>
				tupleCompare(query, before, result, "before"),
			);
		},

		offset(result) {
			if (reverseSlice) {
				return offset ? result.slice(0, -offset) : result;
			}
			return result.slice(offset);
		},

		limit(result) {
			if (reverseSlice) {
				return result.slice(-limit);
			}
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
							: get(result, propQuery);
				}

				// expression
				if (selectEngine.isExpression(propQuery)) {
					return (result) => selectEngine.apply(propQuery, result);
				}

				// subquery
				if (!(propName in resSchema.relationships)) {
					throw new Error(
						`The "${propName}" relationship is undefined on a resource of type "${query.type}". You probably have an invalid schema or constructed your graph wrong. Check that the resources have "inverse" set in the schema, try linking the inverses (via "linkInverses"), check your schema to make sure all inverses have been defined correctly there, and make sure all resources have been loaded into the graph.`,
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
			const applyGroup = (groupQuery, groupResults) => {
				const { aggregates, by, select } = groupQuery;
				const groupMap = new Map();

				// Group the results
				for (const result of groupResults) {
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

				const groupClauses = createGroupQueryGraphClauses(groupQuery, options);
				const hasClause = (opName) =>
					opName === "limit" ||
					opName === "offset" ||
					opName === "before" ||
					opName === "after"
						? groupQuery.slice?.[opName] !== undefined
						: opName in groupQuery;
				const processed = Object.entries(groupClauses).reduce(
					(acc, [opName, fn]) => (hasClause(opName) ? fn(acc) : acc),
					extracted,
				);

				if (groupQuery.group) {
					return applyGroup(groupQuery.group, processed);
				}

				return processed;
			};

			return applyGroup(query.group, results);
		},
	};

	return clauses;
}
