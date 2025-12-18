import { mapValues } from "es-toolkit";
import { looksLikeExpression } from "../lib/helpers.js";
import { normalizeQuery } from "./normalize-query.js";
import { extractQuerySelection } from "./helpers.js";

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

const getQuerySelectExtent = createClauseExtractor((subquery, addPath) => {
	Object.values(subquery.select ?? {}).forEach((val) => {
		if (typeof val === "string") {
			return addPath([val]);
		}
		if (looksLikeExpression(val)) {
			const exprPaths = extractQuerySelection(val);
			return exprPaths.paths.forEach((exprPath) => {
				addPath([...exprPath]);
			});
		}
	});
});

export function getFullQueryExtent(schema, query) {
	return getQuerySelectExtent(schema, query);
}

export function getQueryExtentByClause(schema, query) {
	const normalQuery = normalizeQuery(schema, query);
	return {
		group: getQueryGroupExtent(schema, normalQuery),
		select: getQuerySelectExtent(schema, normalQuery),
		where: getQueryWhereExtent(schema, normalQuery),
	};
}
