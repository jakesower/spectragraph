import { mapKeys, mapValues, pick } from "lodash-es";

function walk(schema, rootQuery, rootTree) {
	const output = [];

	const go = (query, tree, type, path, ancestors) => {
		console.log("go", query, tree, type, path, ancestors);
		const resDef = schema.resources[type];

		const propProps = pick(query.properties, Object.keys(resDef.properties));
		const relProps = pick(query.properties, Object.keys(resDef.relationships));
		const relKeys = Object.keys(relProps);

		const resProps = {};
		Object.keys(propProps).forEach((propName) => {
			resProps[[...path, propName].join(".")] = tree[propName];
		});

		// hit the bottom
		if (relKeys.length === 0) {
			output.push({ ...ancestors, ...resProps });
			return;
		}

		Object.entries(relProps).forEach(([propName, propQuery]) => {
			const relDef = resDef.relationships[propName];
			if (relDef.cardinality === "one") {
				go(propQuery, tree[propName], relDef.resource, [...path, propName], {
					...ancestors,
					...resProps,
				});
			} else {
				tree[propName].forEach((subTree) => {
					go(propQuery, subTree, relDef.resource, [...path, propName], {
						...ancestors,
						...resProps,
					});
				});
			}
		});
	};

	go(rootQuery, rootTree, rootQuery.type, [], {});
	return output;
}

export function tabularize(schema, query, tree) {
	return walk(schema, query, tree);
}
