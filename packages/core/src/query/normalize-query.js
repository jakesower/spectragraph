import { mapValues, omit, pick } from "es-toolkit";
import { validateQuery } from "../query.js";
import { defaultSelectEngine, defaultWhereEngine } from "../lib/defaults.js";
import { ensure } from "../lib/helpers.js";

export const NORMALIZED = Symbol("normalized");

const distributingExpressions = {
	$and: (operand, { resolve }) => ({
		$and: operand.map(resolve),
	}),
	$or: (operand, { resolve }) => ({
		$or: operand.map(resolve),
	}),
	$not: (operand, { resolve }) => ({
		$not: resolve(operand),
	}),
};

const looksLikeExpression = (val) =>
	val !== null &&
	typeof val === "object" &&
	!Array.isArray(val) &&
	Object.keys(val).length === 1 &&
	Object.keys(val)[0].startsWith("$");

function expandSelectObject(schema, select, type) {
	const resSchema = schema.resources[type];

	const selectWithExpandedStar =
		select === "*" ? Object.keys(resSchema.attributes) : select;

	const selectObj = Array.isArray(selectWithExpandedStar)
		? (() => {
				const result = {};
				for (const item of selectWithExpandedStar) {
					if (typeof item === "string") {
						result[item] = item;
					} else {
						Object.assign(result, item);
					}
				}
				return result;
			})()
		: select;

	return selectObj["*"]
		? (() => {
				const result = {};
				for (const attr of Object.keys(resSchema.attributes)) {
					result[attr] = attr;
				}
				Object.assign(result, omit(selectObj, ["*"]));
				return result;
			})()
		: selectObj;
}

const groupNormalizers = {
	by(schema, groupQuery) {
		return Array.isArray(groupQuery.by) ? groupQuery.by : [groupQuery.by];
	},
	select(schema, groupQuery, type) {
		return expandSelectObject(
			schema,
			groupQuery.select ?? this.by(schema, groupQuery),
			type,
		);
	},
	order(schema, groupQuery) {
		return Array.isArray(groupQuery.order)
			? groupQuery.order
			: [groupQuery.order];
	},
};

const normalizers = {
	select(schema, query, type, normalizeSubquery) {
		const { select } = query;
		const expandedSelect = expandSelectObject(schema, select, type);

		return mapValues(expandedSelect, (sel, key) => {
			if (
				key in schema.resources[type].relationships &&
				(typeof sel === "object" || sel === "*")
			) {
				const relType = schema.resources[type].relationships[key].type;
				return normalizeSubquery(sel, relType);
			}
			return sel;
		});
	},
	group(schema, query, type) {
		const applyGroup = (groupQuery) => {
			const defaultedGroupQuery = {
				aggregates: {},
				...groupQuery,
				select: groupQuery.select ?? groupQuery.by,
				...(groupQuery.group ? { group: applyGroup(groupQuery.group) } : {}),
			};

			return mapValues(defaultedGroupQuery, (val, clauseName) =>
				clauseName in groupNormalizers
					? groupNormalizers[clauseName](schema, groupQuery, type)
					: val,
			);
		};

		return applyGroup(query.group);
	},
	where(schema, query) {
		const resSchema = schema.resources[query.type];
		const attributeNames = Object.keys(resSchema.attributes);
		const expandedSelect = expandSelectObject(
			schema,
			query.select ?? {}, // group queries don't have a select clause
			query.type,
		);

		const resolve = (node) => {
			if (looksLikeExpression(node)) {
				const [expressionName, operand] = Object.entries(node)[0];

				// distributing expressions ($and/$or/$not) recursively normalize their operands
				if (expressionName in distributingExpressions) {
					const expression = distributingExpressions[expressionName];
					return expression(operand, { resolve });
				}

				// non-distributing expressions are returned as-is
				return node;
			}

			if (typeof node === "object" && node !== null && !Array.isArray(node)) {
				// Attribute filters work on data directly returned in the results
				const attributeFilterKeys = pick(node, attributeNames);
				const attributeFilters = mapValues(attributeFilterKeys, (n) =>
					Array.isArray(n) ? { $in: n } : n,
				);

				// Derived filters come from select fields that are expressions that
				// need to be resolved before they can be compared.
				const derivedFilterKeys = omit(node, attributeNames);
				const derivedFilters = Object.entries(derivedFilterKeys).map(
					([filterName, filter]) =>
						Array.isArray(filter)
							? { $pipe: [expandedSelect[filterName], { $in: filter }] }
							: looksLikeExpression(filter)
								? { $pipe: [expandedSelect[filterName], filter] }
								: { $pipe: [expandedSelect[filterName], { $eq: filter }] },
				);

				const allFilters = {
					$and: [{ $matchesAll: attributeFilters }, ...derivedFilters],
				};

				return allFilters.$and.length === 1 ? allFilters.$and[0] : allFilters;
			}

			throw new Error("where clauses must either be objects or expressions");
		};

		return query.where ? resolve(query.where) : {};
	},
	order(schema, query) {
		return Array.isArray(query.order) ? query.order : [query.order];
	},
};

/**
 * Normalizes a query by expanding shorthand syntax and ensuring consistent structure
 *
 * @param {Object} schema - The schema object
 * @param {RootQuery} rootQuery - The query to normalize
 * @param {Object} [options]
 * @param {import('../lib/defaults.js').SelectExpressionEngine} [options.selectEngine] - Expression engine for SELECT clauses
 * @param {import('../lib/defaults.js').WhereExpressionEngine} [options.whereEngine] - Expression engine for WHERE clauses
 * @returns {NormalQuery} The normalized query
 */
export function normalizeQuery(schema, rootQuery, options = {}) {
	if (rootQuery[NORMALIZED]) return rootQuery;

	const {
		selectEngine = defaultSelectEngine,
		whereEngine = defaultWhereEngine,
	} = options;

	ensure(validateQuery)(schema, rootQuery, { selectEngine, whereEngine });

	const normalizeSubquery = (query, type) => {
		const initQuery =
			typeof query === "object" && (query.select || query.group)
				? { type, ...query }
				: { type, select: query };

		return mapValues(initQuery, (val, clauseName) =>
			clauseName in normalizers
				? normalizers[clauseName](schema, initQuery, type, normalizeSubquery)
				: val,
		);
	};

	const normalQuery = normalizeSubquery(rootQuery, rootQuery.type);
	Object.defineProperty(normalQuery, NORMALIZED, {
		value: true,
		enumerable: false,
		writable: false,
		configurable: false,
	});

	return normalQuery;
}
