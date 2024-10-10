import { mapValues, omit, snakeCase } from "lodash-es";
export async function getOne(type, id, context) {
    const { config, options = {}, schema } = context;
    const { includeRelationships = true } = options;
    const { db } = config;
    const resConfig = config.resources[type];
    const { joins, table } = resConfig;
    const resSchema = schema.resources[type];
    const { idAttribute = "id" } = resSchema;
    const attrNames = Object.keys(resSchema.attributes);
    const output = { type, id, attributes: {}, relationships: {} };
    const localRelationships = Object.entries(joins).filter(([_, j]) => "localColumn" in j);
    const foreignRelationships = Object.entries(joins).filter(([_, j]) => "foreignColumn" in j);
    const manyToManyRelationships = Object.entries(joins).filter(([_, j]) => "localJoinColumn" in j);
    const foreignQueries = includeRelationships
        ? [
            ...foreignRelationships.map(async ([joinName, joinInfo]) => {
                const { foreignColumn } = joinInfo;
                const relSchema = resSchema.relationships[joinName];
                const relResSchema = schema.resources[relSchema.type];
                const relConfig = config.resources[relSchema.type];
                const foreignTable = relConfig.table;
                const foreignId = snakeCase(relResSchema.idAttribute ?? "id");
                const { rows } = await db.query({
                    rowMode: "array",
                    text: `SELECT ${foreignId} FROM ${foreignTable} WHERE ${foreignColumn} = $1`,
                }, [id]);
                output.relationships[joinName] =
                    relSchema.cardinality === "one"
                        ? rows[0]
                            ? { type: relSchema.type, id: rows[0][0] }
                            : null
                        : rows.map((r) => ({ type: relSchema.type, id: r[0] }));
            }),
            ...manyToManyRelationships.map(async ([joinName, joinInfo]) => {
                const { foreignJoinColumn, joinTable, localJoinColumn } = joinInfo;
                const relSchema = resSchema.relationships[joinName];
                const { rows } = await db.query({
                    rowMode: "array",
                    text: `SELECT ${foreignJoinColumn} FROM ${joinTable} WHERE ${localJoinColumn} = $1`,
                }, [id]);
                output.relationships[joinName] = rows.map((r) => ({
                    type: relSchema.type,
                    id: r[0],
                }));
            }),
        ]
        : [];
    const cols = [
        ...attrNames.map((attrName) => resSchema.attributes[attrName]?.format === "geography"
            ? `ST_AsGeoJSON(${snakeCase(attrName)})`
            : snakeCase(attrName)),
        ...localRelationships.map(([_, r]) => snakeCase(r.localColumn)),
    ].join(", ");
    const localQuery = db.query({
        rowMode: "array",
        text: `SELECT ${cols} FROM ${table} WHERE ${snakeCase(idAttribute)} = $1`,
    }, [id]);
    const [localResult] = await Promise.all([localQuery, ...foreignQueries]);
    const { rows } = localResult;
    const row = rows[0];
    if (!row)
        return null;
    attrNames.forEach((attr, idx) => {
        output.attributes[attr] =
            typeof row[idx] === "string" &&
                ["array", "object"].includes(resSchema.attributes[attr].type)
                ? JSON.parse(row[idx])
                : row[idx];
    });
    if (includeRelationships) {
        localRelationships.forEach(([relName], idx) => {
            const id = row[idx + attrNames.length];
            output.relationships[relName] = id
                ? {
                    type: resSchema.relationships[relName].type,
                    id,
                }
                : null;
        });
    }
    return includeRelationships ? output : omit(output, "relationships");
}
export async function getAll(type, context) {
    const { config, options = {}, schema } = context;
    const { includeRelationships = true } = options;
    const { db } = config;
    const resConfig = config.resources[type];
    const { joins, table } = resConfig;
    const resSchema = schema.resources[type];
    const attrNames = Object.keys(resSchema.attributes);
    const resources = {};
    const localRelationships = Object.entries(joins).filter(([_, j]) => "localColumn" in j);
    const cols = [
        snakeCase(resSchema.idAttribute ?? "id"),
        ...attrNames.map((attrName) => resSchema.attributes[attrName]?.format === "geography"
            ? `ST_AsGeoJSON(${snakeCase(attrName)})`
            : snakeCase(attrName)),
        ...localRelationships.map(([_, r]) => snakeCase(r.localColumn)),
    ].join(", ");
    const localQuery = db.query({
        rowMode: "array",
        text: `SELECT ${cols} FROM ${table}`,
    });
    const { rows } = await localQuery;
    rows.forEach((row) => {
        const resource = { type, id: row[0], attributes: {} };
        if (includeRelationships) {
            resource.relationships = mapValues(resSchema.relationships, (rel) => rel.cardinality === "one" ? null : []);
        }
        attrNames.forEach((attr, idx) => {
            resource.attributes[attr] =
                typeof row[idx + 1] === "string" &&
                    ["array", "object"].includes(resSchema.attributes[attr].type)
                    ? JSON.parse(row[idx + 1])
                    : row[idx + 1];
        });
        if (includeRelationships) {
            localRelationships.forEach(([relName], idx) => {
                const id = row[idx + attrNames.length + 1];
                resource.relationships[relName] = id
                    ? {
                        type: resSchema.relationships[relName].type,
                        id,
                    }
                    : null;
            });
        }
        resources[resource.id] = resource;
    });
    if (includeRelationships) {
        const foreignRelationships = Object.entries(joins).filter(([_, j]) => "foreignColumn" in j);
        const manyToManyRelationships = Object.entries(joins).filter(([_, j]) => "localJoinColumn" in j);
        const foreignQueries = [
            ...foreignRelationships.map(async ([joinName, joinInfo]) => {
                const { foreignColumn } = joinInfo;
                const relSchema = resSchema.relationships[joinName];
                const relResSchema = schema.resources[relSchema.type];
                const relConfig = config.resources[relSchema.type];
                const foreignTable = relConfig.table;
                const foreignId = snakeCase(relResSchema.idAttribute ?? "id");
                const { rows } = await db.query({
                    rowMode: "array",
                    text: `SELECT ${foreignColumn}, ${foreignId} FROM ${foreignTable} WHERE ${foreignColumn} IS NOT NULL`,
                });
                rows.forEach((row) => {
                    const resource = resources[row[0]];
                    if (relSchema.cardinality === "one") {
                        resource.relationships[joinName] = {
                            type: relSchema.type,
                            id: row[1],
                        };
                    }
                    else {
                        resource.relationships[joinName].push({
                            type: relSchema.type,
                            id: row[1],
                        });
                    }
                });
            }),
            ...manyToManyRelationships.map(async ([joinName, joinInfo]) => {
                const { foreignJoinColumn, joinTable, localJoinColumn } = joinInfo;
                const relSchema = resSchema.relationships[joinName];
                const { rows } = await db.query({
                    rowMode: "array",
                    text: `SELECT ${localJoinColumn}, ${foreignJoinColumn} FROM ${joinTable} WHERE ${localJoinColumn} IS NOT NULL`,
                });
                rows.forEach((row) => {
                    const resource = resources[row[0]];
                    resource.relationships[joinName].push({
                        type: relSchema.type,
                        id: row[1],
                    });
                });
            }),
        ];
        await Promise.all([...foreignQueries]);
    }
    return Object.values(resources);
}
