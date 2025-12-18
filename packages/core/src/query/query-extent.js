import { mapValues } from "es-toolkit";
import { looksLikeExpression } from "../lib/helpers.js";
import { normalizeQuery } from "./normalize-query.js";
import { extractQuerySelection } from "./helpers.js";

export function getFullQueryExtent(schema, query) {
	const normalQuery = normalizeQuery(schema, query);

	// NOTE: extent gets mutated throughout the function
	const extent = { attributes: new Set(), relationships: {} };
	const addExtent = (path) => {
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

		insert(path, query.type, extent);
	};

	const go = (subquery, path) => {
		Object.entries(subquery.select ?? {}).forEach(([key, val]) => {
			const resSchema = schema.resources[subquery.type];

			if (typeof val === "string") {
				return addExtent([...path, val]);
			}
			if (key in resSchema.relationships) {
				return go(val, [...path, key]);
			}
			if (looksLikeExpression(val)) {
				const exprPaths = extractQuerySelection(val);
				return exprPaths.paths.forEach((exprPath) => {
					addExtent([...path, ...exprPath]);
				});
			}

			throw new Error(`unexpected query selection { ${key}: ${val} }`);
		});
	};

	go(normalQuery, []);

	const arrayifyAttributeSets = (curExtent) => ({
		attributes: [...curExtent.attributes],
		relationships: mapValues(curExtent.relationships, arrayifyAttributeSets),
	});

	return arrayifyAttributeSets(extent);
}
