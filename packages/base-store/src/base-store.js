import { normalizeGetQuery } from "@taxonic/core/query";
import { mapObj } from "@taxonic/utils/objects";

export function BaseStore(schema, config) {
  const { resolvers } = config;
  const baseGenericResolverMethods = {
    getId(queryWithId) {
      const { id, ...rest } = queryWithId;
      const resources = this.getAll(rest);
      const resource = resources.find((res) => res.id === id);

      return resource;
    },
    getIds(queryWithIds) {
      const { ids, ...rest } = queryWithIds;
      const idSet = new Set(ids);
      const resources = this.getAll(rest);
      const idResources = resources.filter((res) => idSet.has(res.id));

      return idResources;
    },
    // eslint-disable-next-line no-unused-vars
    getAll(query) {
      throw new Error(
        "`getResources` needs to be provided explicitly to base stores if it is to be called",
      );
    },
  };

  const fullGenericResolvers = {
    ...baseGenericResolverMethods,
    ...(resolvers.generic ?? {}),
  };

  // const allResolvers = mapObj(schema.resources, ())

  const traverse = (subquery) => {};

  return {
    get(query) {
      const normalQuery = normalizeGetQuery(schema, query);
      const resolver = resolvers.generic.all;

      return resolver(normalQuery.type);
    },
  };
}
