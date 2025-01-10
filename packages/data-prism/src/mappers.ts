import { mapValues, pickBy } from "lodash-es";
import { applyOrMap } from "@data-prism/utils";
import { Graph, NormalResource } from "./graph.js";
import { Schema } from "./schema.js";

type Mapper = string | ((res: any) => unknown); // eslint-disable-line
type ResourceMappers = { [k: string]: Mapper; id?: string };
type GraphMappers = { [k: string]: ResourceMappers };

export function flattenResource(resourceId, resource, idAttribute = "id") {
	const relationships = mapValues(resource.relationships, (_, relName) =>
		applyOrMap(resource.relationships[relName], ({ id }) => id),
	);

	return {
		[idAttribute]: resourceId,
		...resource.attributes,
		...relationships,
	};
}

export function normalizeResource(
	resourceType: string,
	resource: { [k: string]: unknown },
	schema: Schema,
	graphMappers: GraphMappers = {},
): NormalResource {
	const resSchema = schema.resources[resourceType];
	const resourceMappers = graphMappers[resourceType] ?? {};

	const attributes = mapValues(resSchema.attributes, (_, attr) => {
		const mapper = resourceMappers[attr];

		return typeof mapper === "function"
			? mapper(resource)
			: mapper
				? resource[mapper]
				: resource[attr];
	});

	const relationships = mapValues(resSchema.relationships, (relSchema, rel) => {
		const relMapper = graphMappers[relSchema.type] ?? {};
		const relResSchema = schema.resources[relSchema.type];
		const mapper = resourceMappers[rel];
		const emptyRel = relSchema.cardinality === "many" ? [] : null;
		const relIdField = relMapper.id ?? relResSchema.idAttribute ?? "id";

		const relVal =
			typeof mapper === "function"
				? mapper(resource)
				: mapper
					? resource[mapper]
					: resource[rel];

		if (relVal === undefined) return undefined;

		return applyOrMap(relVal ?? emptyRel, (relRes) =>
			typeof relRes === "object"
				? { type: relSchema.type, id: relRes[relIdField] }
				: { type: relSchema.type, id: relRes },
		);
	});

	return {
		type: resourceType,
		id: resource[resSchema.idAttribute ?? "id"] as string,
		attributes: pickBy(attributes, (a) => a !== undefined),
		relationships: pickBy(relationships, (r) => r !== undefined),
	};
}

function mergeResources(left, right = { attributes: {}, relationships: {} }) {
	return {
		...left,
		attributes: { ...left.attributes, ...right.attributes },
		relationships: { ...left.relationships, ...right.relationships },
	};
}

export function createGraphFromTrees(
	rootResourceType: string,
	rootResources: { [k: string]: unknown }[],
	schema: Schema,
	graphMappers: GraphMappers = {},
): Graph {
	const output = mapValues(schema.resources, () => ({}));

	const go = (resourceType, resource) => {
		const resourceSchema = schema.resources[resourceType];
		const resourceMappers = graphMappers[resourceType] ?? {};

		const idAttribute =
			resourceMappers.id ?? resourceSchema.idAttribute ?? "id";
		const resourceId = resource[idAttribute];

		output[resourceType][resourceId] = mergeResources(
			normalizeResource(resourceType, resource, schema, graphMappers),
			output[resourceType][resourceId],
		);

		Object.entries(resourceSchema.relationships).forEach(
			([relName, relSchema]) => {
				const mapper = resourceMappers[relName];
				const emptyRel = relSchema.cardinality === "many" ? [] : null;

				const relVal =
					typeof mapper === "function"
						? mapper(resource)
						: mapper
							? resource[mapper]
							: resource[relName];

				return applyOrMap(relVal ?? emptyRel, (relRes) => {
					if (typeof relRes === "object") go(relSchema.type, relRes);
				});
			},
		);
	};

	rootResources.forEach((r) => {
		go(rootResourceType, r);
	});

	return output;
}
