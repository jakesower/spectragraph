import { zipObjWith } from "@polygraph/utils/arrays";
import { mapObj } from "@polygraph/utils/objects";
import { buildSql } from "../build-sql.mjs";
import { composeClauses } from "../compose-clauses.mjs";
import { runQuery } from "../operations/operations.mjs";
import { castValToDb } from "./db-utils.mjs";
// import { columnsToSelect, joinClauses } from "./get-clauses.mjs";

export function get(query, context) {
  const { schema, db, rootClauses = [] } = context;

  const initModifiers = {
    // select: columnsToSelect(schema, query),
    from: schema.resources[query.type].store.table,
    // join: joinClauses(schema, query),
  };

  return runQuery(query, context, (queryModifiers) => {
    const composedModifiers = composeClauses([
      initModifiers,
      ...rootClauses,
      ...queryModifiers,
    ]);
    // console.log(queryModifiers)
    const sql = buildSql(composedModifiers);
    const vars = composedModifiers.vars.map(castValToDb);
    // console.log(sql, vars);
    const statement = db.prepare(sql).raw();
    const allResults = statement.all(vars) ?? null;

    const chunkInto = (items, chunkSizes) => {
      let offset = 0;
      const chunks = [];

      for (let i = 0; i < chunkSizes.length; i += 1) {
        chunks.push(items.slice(offset, chunkSizes[i] + offset));
        offset += chunkSizes[i];
      }

      return chunks;
    };

    const getQueryChunkSize = (subQuery) =>
      Object.values(subQuery.relationships).reduce(
        (sum, relQuery) => sum + getQueryChunkSize(relQuery),
        subQuery.properties.length + 1,
      );

    const buildExtractor = (subQuery) => {
      const relKeys = Object.keys(subQuery.relationships);
      const relValues = Object.values(subQuery.relationships);
      const relResDef = schema.resources[subQuery.type];

      const castProp = (val, prop) =>
        relResDef.properties[prop].type === "boolean"
          ? val === 0
            ? false
            : val === 1
              ? true
              : undefined
          : val === null
            ? undefined
            : val;

      const chunkSizes = [
        1,
        subQuery.properties.length,
        ...relValues.map(getQueryChunkSize),
      ];

      // TODO: this needs to map the obj into a `new Map()` to preserve numeric key order
      const relExtractors = mapObj(subQuery.relationships, buildExtractor);

      return (row, out) => {
        const chunks = chunkInto(row, chunkSizes);
        const [, props, ...relChunks] = chunks;
        const [id] = row;

        if (!id) return;

        if (!out.get(id)) {
          // eslint-disable-next-line no-param-reassign
          out.set(id, {
            id,
            properties: zipObjWith(subQuery.properties, props, castProp),
            relationships: mapObj(subQuery.relationships, () => new Map()),
          });
        }

        relKeys.forEach((relKey, idx) => {
          relExtractors[relKey](relChunks[idx], out.get(id).relationships[relKey]);
        });
      };
    };

    const finalizer = (subQuery, objResTree) => {
      const subResDef = schema.resources[subQuery.type];

      return [...objResTree.values()].map(({ id, properties, relationships }) => ({
        id,
        ...properties,
        ...mapObj(relationships, (rel, relName) => {
          const vals = finalizer(subQuery.relationships[relName], rel);
          return subResDef.properties[relName].cardinality === "one"
            ? vals[0] ?? null
            : vals;
        }),
      }));
    };

    const structuredResults = new Map();
    const rootExtractor = buildExtractor(query);
    allResults.forEach((row) => rootExtractor(row, structuredResults));

    return finalizer(query, structuredResults);
  });
}
