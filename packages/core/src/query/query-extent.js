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

function getQuerySelectExtent(schema, normalQuery) {
	// NOTE: extent gets mutated throughout the function
	const { extent, addPath } = createExtent(schema, normalQuery.type);

	const go = (subquery, path) => {
		Object.entries(subquery.select ?? {}).forEach(([key, val]) => {
			const resSchema = schema.resources[subquery.type];

			if (typeof val === "string") {
				return addPath([...path, val]);
			}
			if (key in resSchema.relationships) {
				return go(val, [...path, key]);
			}
			if (looksLikeExpression(val)) {
				const exprPaths = extractQuerySelection(val);
				return exprPaths.paths.forEach((exprPath) => {
					addPath([...path, ...exprPath]);
				});
			}

			throw new Error(`unexpected query selection { ${key}: ${val} }`);
		});
	};

	go(normalQuery, []);
	return arrayifyAttributeSets(extent);
}

function getQueryGroupExtent(schema, normalQuery) {
	// NOTE: extent gets mutated throughout the function
	const { extent, addPath } = createExtent(schema, normalQuery.type);

	(normalQuery.group?.by ?? []).forEach((by) => addPath([by]));
	Object.values(normalQuery.group?.aggregates ?? {}).forEach((agg) => {
		const exprPaths = extractQuerySelection(agg);
		exprPaths.paths.forEach(addPath);
	});

	return arrayifyAttributeSets(extent);
}

export function getFullQueryExtent(schema, query) {
	return getQuerySelectExtent(schema, query);
}

export function getQueryExtentByClause(schema, query) {
	const normalQuery = normalizeQuery(schema, query);
	return {
		group: getQueryGroupExtent(schema, normalQuery),
		select: getQuerySelectExtent(schema, normalQuery),
	};
}
