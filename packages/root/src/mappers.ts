import { mapValues } from "lodash-es";
import { applyOrMap } from "@data-prism/utils";
import { Graph, NormalResource } from "./graph.js";
import { Schema } from "./schema.js";

type Mapper = string | ((res: any) => unknown);  // eslint-disable-line
type ResourceMappers = { [k: string]: Mapper };
type GraphMappers = { [k: string]: ResourceMappers };

export function flattenResource(resourceId, resource, idField = "id") {
	const relationships = mapValues(resource.relationships, (_, relName) =>
		applyOrMap(resource.relationships[relName], ({ id }) => id),
	);

	return {
		[idField]: resourceId,
		...resource.attributes,
		...relationships,
	};
}

export function normalizeResource(
	resourceType: string,
	resource: { [k: string]: unknown },
	schema: Schema,
	resourceMappers: ResourceMappers = {},
): NormalResource {
	const resSchema = schema.resources[resourceType];

	const attributes = mapValues(resSchema.attributes, (_, attr) => {
		const mapper = resourceMappers[attr];

		return typeof mapper === "function"
			? mapper(resource)
			: mapper
				? resource[mapper]
				: resource[attr];
	});

	const relationships = mapValues(resSchema.relationships, (relSchema, rel) => {
		const mapper = resourceMappers[rel];
		const emptyRel = relSchema.cardinality === "many" ? [] : null;
		const relIdField = schema.resources[relSchema.type].idField ?? "id";

		const relVal =
			typeof mapper === "function"
				? mapper(resource)
				: mapper
					? resource[mapper]
					: resource[rel];

		return applyOrMap(relVal ?? emptyRel, (relRes) =>
			typeof relRes === "object"
				? { type: relSchema.type, id: relRes[relIdField] }
				: { type: relSchema.type, id: relRes },
		);
	});

	return {
		attributes,
		relationships,
	};
}

export function normalizeResources(
	rootResourceType: string,
	rootResources: { [k: string]: unknown }[],
	schema: Schema,
	graphMappers: GraphMappers = {},
): Graph {
	const output = mapValues(schema.resources, () => ({}));

	const go = (resourceType, resource) => {
		const resourceSchema = schema.resources[resourceType];
		const resourceMappers = graphMappers[resourceType] ?? {};

		const idField = resourceMappers.id ?? resourceSchema.idField ?? "id";
		const resourceId = resource[idField as string];

		output[resourceType][resourceId] = normalizeResource(
			resourceType,
			resource,
			schema,
			resourceMappers,
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
