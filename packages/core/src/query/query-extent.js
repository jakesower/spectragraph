import { mapValues, uniq } from "es-toolkit";
import { looksLikeExpression } from "../lib/helpers.js";
import { normalizeQuery } from "./normalize-query.js";
import { extractQuerySelection } from "./helpers.js";

/**
 * @typedef {Object} QueryExtent
 * @property {string[]} attributes - Array of attribute names referenced in the query
 * @property {Object.<string, QueryExtent>} relationships - Map of relationship names to their nested extents
 */

/**
 * @typedef {Object} QueryExtentByClause
 * @property {QueryExtent} select - Extent of attributes/relationships referenced in select clause
 * @property {QueryExtent} where - Extent of attributes/relationships referenced in where clause
 * @property {QueryExtent} order - Extent of attributes/relationships referenced in order clause
 * @property {QueryExtent} group - Extent of attributes/relationships referenced in group clause
 */

function arrayifyAttributeSets(curExtent) {
	return {
		attributes: [...curExtent.attributes],
		relationships: mapValues(curExtent.relationships, arrayifyAttributeSets),
	};
}

// NOTE: this creates a function that mutates the extent argument
function createExtent(schema, baseType) {
	const extent = { attributes: new Set(), relationships: {} };

	return {
		extent,
		addPath: (path) => {
			const insert = (curPath, curType, curExtent) => {
				const resSchema = schema.resources[curType];
				const [head, ...tail] = curPath;

				if (head in resSchema.attributes) {
					curExtent.attributes.add(head);
				} else if (head in resSchema.relationships) {
					if (!(head in curExtent.relationships)) {
						curExtent.relationships[head] = {
							attributes: new Set(),
							relationships: {},
						};
					}

					if (tail.length > 0) {
						insert(
							tail,
							resSchema.relationships[head].type,
							curExtent.relationships[head],
						);
					}
				}
			};

			insert(path, baseType, extent);
		},
	};
}

function createClauseExtractor(extractFn) {
	return (schema, normalQuery) => {
		const { extent, addPath } = createExtent(schema, normalQuery.type);

		const go = (subquery, path) => {
			extractFn(subquery, (xPath) => addPath([...path, ...xPath]));

			const resSchema = schema.resources[subquery.type];
			Object.entries(subquery.select ?? {}).forEach(([k, v]) => {
				if (k in resSchema.relationships) {
					go(v, [...path, k]);
				}
			});
		};

		go(normalQuery, []);
		return arrayifyAttributeSets(extent);
	};
}

const getQueryGroupExtent = createClauseExtractor((subquery, addPath) => {
	(subquery.group?.by ?? []).forEach((by) => addPath([by]));
	Object.values(subquery.group?.aggregates ?? {}).forEach((agg) => {
		const exprPaths = extractQuerySelection(agg);
		exprPaths.paths.forEach(addPath);
	});
});

const getQueryWhereExtent = createClauseExtractor((subquery, addPath) => {
	extractQuerySelection(subquery.where ?? {}).paths.forEach(addPath);
});

const getQueryOrderExtent = createClauseExtractor((subquery, addPath) => {
	(subquery.order ?? []).forEach((o) => {
		Object.keys(o).forEach((k) => addPath([k]));
	});
});

const getQuerySelectExtent = createClauseExtractor((subquery, addPath) => {
	Object.values(subquery.select ?? {}).forEach((val) => {
		if (typeof val === "string") {
			addPath([val]);
		} else if (looksLikeExpression(val)) {
			extractQuerySelection(val).paths.forEach(addPath);
		}
	});
});

/**
 * Analyzes a query to determine which schema attributes and relationships are referenced
 * by each query clause (select, where, order, group).
 *
 * @param {Object} schema - The schema object defining resources, attributes, and relationships
 * @param {Object} query - The query object to analyze
 * @returns {QueryExtentByClause} Object containing separate extents for each clause type
 */
export function getQueryExtentByClause(schema, query) {
	const normalQuery = normalizeQuery(schema, query);
	return {
		group: getQueryGroupExtent(schema, normalQuery),
		select: getQuerySelectExtent(schema, normalQuery),
		order: getQueryOrderExtent(schema, normalQuery),
		where: getQueryWhereExtent(schema, normalQuery),
	};
}

const emptyExtent = { attributes: [], relationships: {} };
const mergeExtents = (left = emptyExtent, right = emptyExtent) => {
	const attributes = uniq([...left.attributes, ...right.attributes]);

	const allRelationships = uniq([
		...Object.keys(left.relationships),
		...Object.keys(right.relationships),
	]);

	const relationships = Object.fromEntries(
		allRelationships.map((rel) => [
			rel,
			mergeExtents(left.relationships[rel], right.relationships[rel]),
		]),
	);

	return { attributes, relationships };
};

/**
 * Analyzes a query to determine the complete set of schema attributes and relationships
 * referenced across all query clauses (select, where, order, group), merged into a single extent.
 *
 * @param {Object} schema - The schema object defining resources, attributes, and relationships
 * @param {Object} query - The query object to analyze
 * @returns {QueryExtent} Single merged extent containing all referenced attributes and relationships
 */
export function getFullQueryExtent(schema, query) {
	return Object.values(getQueryExtentByClause(schema, query)).reduce(
		mergeExtents,
	);
}
