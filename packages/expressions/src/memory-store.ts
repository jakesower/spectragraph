import { difference } from "lodash-es";
import { Query } from "./query";
import { Schema } from "./schema";

export function MemoryStore(schema: Schema, { initialData }) {
	const data = initialData;

	const validateQuery = (resName, query) => {
		const resDef = schema.resources[resName];

		if (!resDef) {
			throw new Error(
				`${resName} is not a valid resource type and was supplied in the query`,
			);
		}

		const invalidProps = difference(
			Object.keys(query.properties),
			Object.keys({ ...resDef.properties, ...resDef.relationships }),
		);

		if (invalidProps.length > 0) {
			throw new Error(
				`Invalid prop(s) present in subquery: ${invalidProps.join(
					", ",
				)}. Query: ${JSON.stringify(query)}`,
			);
		}

		const invalidRelationshipProps = Object.keys(propsConfig ?? {}).filter(
			(propName) =>
				propsConfig[propName].ref &&
				propName in query &&
				(!(typeof query[propName] !== "object") || !("properties" in query[propName])),
		);

		if (invalidRelationshipProps.length > 0) {
			throw new Error(
				`invalid relationship query passed to the query: ${invalidRelationshipProps.join(
					", ",
				)}`,
			);
		}
	};

	return {
		compileQuery(rootQuery) {
			const rootResourceConfig = config.resources[rootQuery.type];
			validateQuery(rootResourceConfig, rootQuery);

			return (vars) => {
				const rootId = evaluate(rootQuery.id, vars);

				const handleProps = (query, resourceType, resource) => {
					const resourceConfig = config.resources[resourceType] ?? {};

					return mapValues(query.properties, (propQuery, propName) => {
						const propConfig = resourceConfig.properties?.[propName] ?? {};
						const { default: defaultVal, ref } = propConfig;
						const propVal = resource[propName] ?? defaultVal;

						if (!ref) return propVal;

						return Array.isArray(propVal)
							? handleMultipleResources(propQuery, ref, propVal)
							: handleSingularResource(propQuery, ref, propVal);
					});
				};

				const handleSingularResource = (query, resourceType, id) => {
					const resourceConfig = config.resources[resourceType];
					const resource = resourceConfig.data[id];
					if (!resource) return null;

					const { filters } = query;
					if (filters && !evaluate(filters, resource)) return null;

					return handleProps(query, resourceType, resource);
				};

				const handleMultipleResources = (query, resourceType, ids) => {
					const resourceConfig = config.resources[resourceType];
					const allResources = ids.map((id) => resourceConfig.data[id]);

					// Sparse fields -- for now all fields in filters/sorts must be queried for
					const expandedResources = allResources.map((resource) =>
						handleProps(query, resourceType, resource),
					);

					const { filters } = query;
					const filterFn = filters && compile(distributeFilterProperties(filters));
					const resources = filterFn
						? expandedResources.filter(
							(resource) => filterFn({ resource, ...vars }), // TODO: what if there's a var named resource?
						  )
						: expandedResources;

					// TODO: Sort

					return resources;
				};

				return Promise.resolve(
					rootId
						? handleSingularResource(rootQuery, rootQuery.type, rootId)
						: handleMultipleResources(
							rootQuery,
							rootQuery.type,
							Object.keys(config.resources[rootQuery.type].data),
						  ),
				);
			};
		},
	};
}
