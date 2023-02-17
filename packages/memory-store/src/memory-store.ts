import { difference, mapValues, merge, pick } from "lodash-es";
import { Query, Subquery, ensureValidQuery } from "./query.js";
import { LooseSchema, Schema, compileSchema } from "./schema.js";
import { evaluateId } from "./query.js";

type MemoryStoreOptions = {
	initialData: any;
};

export function MemoryStore(looseSchema: LooseSchema, options?: MemoryStoreOptions) {
	const schema = compileSchema(looseSchema);
	const data = mapValues(schema.resources, () => ({}));

	const seed = (seedData) => {
		merge(data, seedData); // mutates
	};

	const compileQuery = (rootQuery: Query) => {
		ensureValidQuery(schema, rootQuery);

		// create a function that takes in the various parts of a query and returns a
		// function that takes query arguments and returns the result
		return (args) => {
			const compileSubquery = (resType: string, subquery: Subquery) => {
				const resDef = schema.resources[resType];

				const getProperties = (res) => {
					const props = subquery.properties ?? { [resDef.idField]: {} as Subquery };
					return mapValues(props, (propQuery, propName) => {
						if (propName in resDef.relationships) {
							const relDef = resDef.relationships[propName];

							return relDef.cardinality === "one"
								? res[propName]
									? compileSubquery(relDef.resource, { ...propQuery, id: res[propName] })
									: null
								: res[propName].map((id) =>
									compileSubquery(relDef.resource, { ...propQuery, id }),
								  );
						}

						return res[propName];
					});
				};

				if ("id" in subquery) {
					const id = evaluateId(subquery.id, args);
					const res = data[resType][id];

					return res ? getProperties(res) : null;
				}

				return Object.values(data[resType]).map(getProperties);
			};

			return compileSubquery(rootQuery.type, rootQuery);
		};
	};

	const get = (rootQuery: Query, args = {}) => {
		return compileQuery(rootQuery)(args);
	};

	return { compileQuery, get, seed };

	// 	const rootResourceConfig = config.resources[rootQuery.type];
	// 	validateQuery(rootResourceConfig, rootQuery);

	// 	return (vars) => {
	// 		const rootId = evaluate(rootQuery.id, vars);

	// 		const handleProps = (query, resourceType, resource) => {
	// 			const resourceConfig = config.resources[resourceType] ?? {};

	// 			return mapValues(query.properties, (propQuery, propName) => {
	// 				const propConfig = resourceConfig.properties?.[propName] ?? {};
	// 				const { default: defaultVal, ref } = propConfig;
	// 				const propVal = resource[propName] ?? defaultVal;

	// 				if (!ref) return propVal;

	// 				return Array.isArray(propVal)
	// 					? handleMultipleResources(propQuery, ref, propVal)
	// 					: handleSingularResource(propQuery, ref, propVal);
	// 			});
	// 		};

	// 		const handleSingularResource = (query, resourceType, id) => {
	// 			const resourceConfig = config.resources[resourceType];
	// 			const resource = resourceConfig.data[id];
	// 			if (!resource) return null;

	// 			const { filters } = query;
	// 			if (filters && !evaluate(filters, resource)) return null;

	// 			return handleProps(query, resourceType, resource);
	// 		};

	// 		const handleMultipleResources = (query, resourceType, ids) => {
	// 			const resourceConfig = config.resources[resourceType];
	// 			const allResources = ids.map((id) => resourceConfig.data[id]);

	// 			// Sparse fields -- for now all fields in filters/sorts must be queried for
	// 			const expandedResources = allResources.map((resource) =>
	// 				handleProps(query, resourceType, resource),
	// 			);

	// 			const { filters } = query;
	// 			const filterFn = filters && compile(distributeFilterProperties(filters));
	// 			const resources = filterFn
	// 				? expandedResources.filter(
	// 					(resource) => filterFn({ resource, ...vars }), // TODO: what if there's a var named resource?
	// 				  )
	// 				: expandedResources;

	// 			// TODO: Sort

	// 			return resources;
	// 		};

	// 		return Promise.resolve(
	// 			rootId
	// 				? handleSingularResource(rootQuery, rootQuery.type, rootId)
	// 				: handleMultipleResources(
	// 					rootQuery,
	// 					rootQuery.type,
	// 					Object.keys(config.resources[rootQuery.type].data),
	// 				  ),
	// 		);
	// 	};
	// },
}
