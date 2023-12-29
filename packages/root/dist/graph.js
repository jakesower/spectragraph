import { applyOrMap } from "@data-prism/utils";
export function linkInverses(graph, schema) {
    const output = structuredClone(graph);
    Object.entries(schema.resources).forEach(([resType, resSchema]) => {
        const sampleRes = Object.values(graph[resType])[0];
        Object.entries(resSchema.relationships).forEach(([relName, relSchema]) => {
            const { cardinality, type: foreignType, inverse } = relSchema;
            if (sampleRes.relationships[relName] !== undefined || !inverse)
                return;
            if (cardinality === "one") {
                const map = {};
                Object.entries(graph[foreignType]).forEach(([foreignId, foreignRes]) => {
                    applyOrMap(foreignRes.relationships[inverse], (foreignRef) => {
                        map[foreignRef.id] = foreignId;
                    });
                });
                Object.entries(output[resType]).forEach(([localId, localRes]) => {
                    localRes.relationships[relName] = map[localId]
                        ? { type: foreignType, id: map[localId] }
                        : null;
                });
            }
            else if (cardinality === "many") {
                const map = {};
                Object.entries(graph[foreignType]).forEach(([foreignId, foreignRes]) => {
                    applyOrMap(foreignRes.relationships[inverse], (foreignRef) => {
                        if (!map[foreignRef.id])
                            map[foreignRef.id] = [];
                        map[foreignRef.id].push(foreignId);
                    });
                });
                Object.entries(output[resType]).forEach(([localId, localRes]) => {
                    localRes.relationships[relName] = map[localId]
                        ? map[localId].map((id) => ({ type: foreignType, id }))
                        : [];
                });
            }
        });
    });
    return output;
}
