import { compileQuery, normalizeQuery } from "@blossom-js/core/query";
import { defaultResource, normalizeResource } from "@blossom-js/core/resource";
import { buildResourceTable } from "@blossom-js/core/resource-table";
import {
  compileSchema,
  getRelationshipProperties,
} from "@blossom-js/core/schema";
import { normalizeTree } from "@blossom-js/core/tree";
import {
  ensureCreatedResourceFields,
  ensureValidGetQuerySyntax,
  ensureValidSetQuerySyntax,
} from "@blossom-js/core/validation";
import {
  asArray,
  difference,
  differenceBy,
  groupBy,
  uniq,
} from "@blossom-js/utils/arrays";
import { deepClone } from "@blossom-js/utils/generics";
import { mapObj } from "@blossom-js/utils/objects";

/**
 * TODO:
 * - Some queries guarantee no internal inconsistencies, a good place for optimization.
 */
function makeEmptyStore(schema) {
  const resources = {};
  const resTypes = Object.keys(schema.resources);
  resTypes.forEach((resourceName) => {
    resources[resourceName] = {};
  });

  return resources;
}

export function MemoryStore(rawSchema) {
  const schema = compileSchema(rawSchema);
  let store = makeEmptyStore(schema);

  // use `function` syntax to use `this` for chaining
  function seed(nextStore) {
    store = deepClone(nextStore);
    return this;
  }

  const get = (query) => {
    const run = (storeQuery) => Object.values(store[storeQuery.type]);
    const context = { query, run, schema };
    const runner = compileQuery(query, context);

    return runner();
  };

  const set = async (rawQuery, rawTreeOrTrees) => {
    ensureValidSetQuerySyntax(schema, rawQuery);

    const rootQuery = normalizeQuery(schema, rawQuery);
    const context = { query: rootQuery, rootQuery, schema };

    const rootTrees = normalizeTree(rootQuery, rawTreeOrTrees);
    const resourceTable = await buildResourceTable(
      schema,
      async ({ setResource }) => {
        const go = async (tree) => {
          const getQuery = normalizeQuery(schema, {
            type: tree.type,
            id: tree.id,
            allProps: true,
            relationships: mapObj(tree.relationships, () => ({})),
          });

          // TODO: make this even resemble performant
          const existing = await get(getQuery, { ...context, query: getQuery });
          setResource(tree, existing);

          return Promise.all(
            Object.values(tree.relationships).flatMap(async (treeRels) =>
              Promise.all(treeRels.flatMap(go)),
            ),
          );
        };

        const rootQueryWithAllRels = {
          ...rootQuery,
          args: {
            ...rootQuery.args,
            relationships: mapObj(
              getRelationshipProperties(schema, rootQuery.type),
              () => ({}),
            ),
          },
        };

        const rootExisting = asArray(
          await get(rootQueryWithAllRels, {
            ...context,
            query: rootQueryWithAllRels,
          }),
        );

        const absent = differenceBy(
          rootExisting,
          rootTrees,
          (res) => res[schema.idField],
        );

        const out = await Promise.all(rootTrees.flatMap(go));
        absent.forEach((absentRes) => {
          setResource(
            null,
            normalizeResource(schema, rootQuery.type, absentRes),
          );
        });

        return out;
      },
    );

    const resources = Object.values(resourceTable).flatMap((t) =>
      Object.values(t),
    );
    const byStatus = groupBy(resources, (res) => res.status);
    const { inserted = [], updated = [], deleted = [] } = byStatus;

    inserted.forEach((res) => {
      ensureCreatedResourceFields(schema, res);

      const resDef = schema.resources[res.type];
      const treeToInsert = {
        [resDef.idField]: res.id,
        ...defaultResource(schema, res.type),
        ...res.properties,
        ...mapObj(res.relationships, (rel, relName) => {
          const relDef = resDef.properties[relName];
          return relDef.cardinality === "one"
            ? rel.added[0] ?? null
            : rel.added;
        }),
      };

      store[res.type][res.id] = treeToInsert;
    });

    updated.forEach((res) => {
      const existing = store[res.type][res.id];

      // TODO: this should be done somewhere else
      const nextRels = mapObj(res.relationships, (relChanges, relName) => {
        const relDef = schema.resources[res.type].properties[relName];

        return relDef.cardinality === "one"
          ? relChanges.removed.length > 0 &&
            !relChanges.added.length > 0 &&
            relChanges.removed[0] === existing[relName]
            ? null
            : relChanges.added[0] ?? existing[relName] ?? null
          : uniq([
              ...difference(existing[relName], relChanges.removed),
              ...relChanges.added,
            ]);
      });

      const treeToUpdate = {
        ...existing,
        ...res.properties,
        ...nextRels,
      };

      store[res.type][res.id] = treeToUpdate;
    });

    deleted.forEach((res) => {
      delete store[res.type][res.id];
    });
  };

  return {
    get(rawQuery) {
      ensureValidGetQuerySyntax(schema, rawQuery);
      const query = normalizeQuery(schema, rawQuery);

      return get(query);
    },
    seed,
    set(rawQuery, rootTreeOrTrees) {
      ensureValidSetQuerySyntax(schema, rawQuery);
      return set(rawQuery, rootTreeOrTrees);
    },
  };
}
