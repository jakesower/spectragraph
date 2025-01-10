import { v4 as uuidv4 } from "uuid";
import { mapValues, pick } from "lodash-es";
import { applyOrMap } from "@data-prism/utils";
import { validateResourceTree } from "./validate.js";
export function splice(resourceTree, context) {
    const { schema, validator, store, storeGraph } = context;
    const errors = validateResourceTree(schema, resourceTree, validator);
    if (errors.length > 0)
        throw new Error("invalid resource", { cause: errors });
    const expectedExistingResources = (res) => {
        const related = Object.values(res.relationships ?? {}).flatMap((rel) => rel
            ? Array.isArray(rel)
                ? rel.flatMap((r) => ("attributes" in r || "relationships" in r) && "id" in r
                    ? expectedExistingResources(r)
                    : rel)
                : "attributes" in rel || "relationships" in rel
                    ? expectedExistingResources(rel)
                    : rel
            : null);
        return !res.id ? related : [{ type: res.type, id: res.id }, ...related];
    };
    const missing = expectedExistingResources(resourceTree)
        .filter((ref) => ref && ref.id)
        .find(({ type, id }) => !store.getOne(type, id));
    if (missing) {
        throw new Error(`expected { type: "${missing.type}", id: "${missing.id}" } to already exist in the graph`);
    }
    const go = (res, parent = null, parentRelSchema = null) => {
        const resSchema = schema.resources[res.type];
        const resCopy = structuredClone(res);
        const inverse = parentRelSchema?.inverse;
        if (parent && inverse) {
            const relSchema = resSchema.relationships[inverse];
            resCopy.relationships = resCopy.relationships ?? {};
            if (relSchema.cardinality === "many" &&
                !(resCopy.relationships[inverse] ?? []).some((r) => r.id === res.id)) {
                resCopy.relationships[inverse] = [
                    ...(resCopy.relationships[inverse] ?? []),
                    { type: parent.type, id: parent.id },
                ];
            }
            else if (relSchema.cardinality === "one") {
                const existing = store.getOne(parent.type, parent.id);
                const existingRef = existing?.relationships?.[inverse];
                if (existingRef && existingRef.id !== parent.id) {
                    storeGraph[existing.type][existing.id] = {
                        ...existing,
                        relationships: { ...existing.relationships, [inverse]: null },
                    };
                }
                resCopy.relationships[inverse] = { type: parent.type, id: parent.id };
            }
        }
        const existing = store.getOne(res.type, res.id);
        const resultId = res.id ?? existing?.id ?? uuidv4();
        const prepped = res.id
            ? {
                type: resCopy.type,
                id: resultId,
                attributes: { ...existing.attributes, ...resCopy.attributes },
                relationships: {
                    ...existing.relationships,
                    ...resCopy.relationships,
                },
            }
            : {
                type: resCopy.type,
                id: resultId,
                attributes: resCopy.attributes ?? {},
                relationships: {
                    ...mapValues(resSchema.relationships, (r) => r.cardinality === "one" ? null : []),
                    ...resCopy.relationships,
                },
            };
        const normalized = {
            ...prepped,
            relationships: pick(prepped.relationships, ["type", "id"]),
        };
        storeGraph[res.type][resultId] = existing
            ? {
                ...normalized,
                attributes: { ...existing.attributes, ...normalized.attributes },
                relationships: {
                    ...existing.relationships,
                    ...normalized.relationships,
                },
            }
            : normalized;
        const preppedRels = mapValues(prepped.relationships ?? {}, (rel, relName) => {
            const relSchema = resSchema.relationships[relName];
            const step = (relRes) => relRes.attributes || relRes.relationships
                ? go(relRes, prepped, relSchema)
                : relRes;
            const result = applyOrMap(rel, step);
            storeGraph[res.type][resultId].relationships[relName] = applyOrMap(result, (r) => ({ type: relSchema.type, id: r.id }));
            return result;
        });
        return { ...prepped, relationships: preppedRels };
    };
    return go(resourceTree, null, null);
}
