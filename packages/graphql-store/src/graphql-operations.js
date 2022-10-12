const formatGraphqlValue = (taxonicType, val) =>
  taxonicType === "string" ? `"${val}"` : val;

export const graphqlOperations = {
  id: {
    apply: (storeQuery, { graphqlConfig, query, schema }) => {
      // the reason for this is that the id field for the resource and the id
      // field for the resolver could be different...
      const resolver = graphqlConfig[query.type].resolvers.one;
      const resolverIdField = resolver.idField
        ? resolver.idField
        : query.idField;
      const resourceDef = schema.resources[query.type];
      const idType = resourceDef.properties[resourceDef.idField].type;

      const formattedId = formatGraphqlValue(idType, query.id);

      return {
        ...storeQuery,
        args: {
          ...storeQuery.args,
          [resolverIdField]: formattedId,
        },
      };
    },
    visitsAny: ["id"],
  },
  properties: {
    apply: (storeQuery, { query }) => ({
      ...storeQuery,
      properties: [query.idField, ...(query.properties ?? [])],
    }),
    handlesAny: ["properties"],
  },
  limitOffset: {
    apply: (storeQuery, { query }) => ({
      ...storeQuery,
      args: {
        ...storeQuery.args,
        limit: query.args.limit,
      },
    }),
    handlesAny: ["limit"],
  },
  limitOnly: {
    apply: (storeQuery, { query }) => {
      const { limit, offset = 0 } = query.args;
      return {
        ...storeQuery,
        args: {
          ...storeQuery.args,
          limit: limit + offset,
        },
      };
    },
    visitsAny: ["limit"],
  },
};
