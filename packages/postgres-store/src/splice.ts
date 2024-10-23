import { Ajv } from "ajv";
import { v4 as uuidv4 } from "uuid";
import { validateResourceTree } from "./validate";
import { MemoryStore, NormalResourceTree } from "./memory-store";
import { createEmptyGraph, Ref } from "./graph";
import { Schema } from "./schema";
import { applyOrMap } from "@data-prism/utils";
import { mapValues, pick } from "lodash-es";

export function splice(
	schema: Schema,
	resource: NormalResourceTree,
	validator: Ajv,
	store: MemoryStore,
): NormalResourceTree {
	const errors = validateResourceTree(schema, resource, validator);
	if (errors.length > 0) throw new Error("invalid resource", { cause: errors });

	const expectedExistingResources = (res: NormalResourceTree): Ref[] => {
		const related = Object.values(res.relationships ?? {}).flatMap((rel) =>
			rel
				? Array.isArray(rel)
					? rel.flatMap((r) =>
							("attributes" in r || "relationships" in r) && "id" in r
								? expectedExistingResources(r as NormalResourceTree)
								: (rel as unknown as Ref),
						)
					: "attributes" in rel || "relationships" in rel
						? expectedExistingResources(rel as NormalResourceTree)
						: (rel as unknown as Ref)
				: null,
		);

		return res.new || !res.id
			? related
			: [{ type: res.type, id: res.id }, ...related];
	};

	const missing = expectedExistingResources(resource)
		.filter((ref) => ref && ref.id)
		.find(({ type, id }) => !store.getOne(type, id));
	if (missing) {
		throw new Error(
			`expected { type: "${missing.type}", id: "${missing.id}" } to already exist in the graph`,
		);
	}

	const resultGraph = createEmptyGraph(schema);
	const go = (
		res: NormalResourceTree,
		parent: NormalResourceTree = null,
		parentRelSchema = null,
	): NormalResourceTree => {
		const resSchema = schema.resources[res.type];
		const resCopy = structuredClone(res);
		const inverse = parentRelSchema?.inverse;

		if (parent && inverse) {
			const relSchema = resSchema.relationships[inverse];
			resCopy.relationships = resCopy.relationships ?? {};
			if (
				relSchema.cardinality === "many" &&
				(
					(resCopy.relationships[inverse] ?? []) as Ref[] | NormalResourceTree[]
				).some((r) => r.id === res.id)
			) {
				resCopy.relationships[inverse] = [
					...(resCopy.relationships[inverse] as Ref[] | NormalResourceTree[]),
					{ type: parent.type, id: parent.id },
				] as Ref[] | NormalResourceTree[];
			} else if (relSchema.cardinality === "one") {
				const existing = store.getOne(parent.type, parent.id);
				const existingRef = existing?.relationships?.[inverse] as Ref;

				if (existingRef && existingRef.id !== parent.id) {
					resultGraph[existing.type][existing.id] = {
						...existing,
						relationships: { ...existing.relationships, [inverse]: null },
					};
				}

				resCopy.relationships[inverse] = { type: parent.type, id: parent.id };
			}
		}

		const existing = store.getOne(res.type, res.id);
		const resultId: string = res.id ?? existing?.id ?? uuidv4();
		const prepped =
			res.new || !res.id
				? {
						type: resCopy.type,
						id: resultId,
						attributes: resCopy.attributes ?? {},
						relationships: {
							...mapValues(resSchema.relationships, (r) =>
								r.cardinality === "one" ? null : [],
							),
							...resCopy.relationships,
						},
					}
				: {
						type: resCopy.type,
						id: resultId,
						attributes: { ...existing.attributes, ...resCopy.attributes },
						relationships: {
							...existing.relationships,
							...resCopy.relationships,
						},
					};

		const normalized = {
			...prepped,
			relationships: pick(prepped.relationships, ["type", "id"]) as {
				[k: string]: Ref | Ref[];
			},
		};

		resultGraph[resource.type][resultId] = normalized;

		const preppedRels = mapValues(
			prepped.relationships ?? {},
			(rel, relName) => {
				const relSchema = resSchema.relationships[relName];
				const step = (relRes) =>
					relRes.attributes || relRes.relationships
						? go(relRes, resource, relSchema)
						: relRes;

				return applyOrMap(rel, step);
			},
		);

		return { ...prepped, relationships: preppedRels };
	};

	return go(resource, null, null);
}
