import { TaxonicError } from "@taxonic/core/errors";
import { compileQuery, normalizeQuery } from "@taxonic/core/query";
import { pick } from "@taxonic/utils/objects";
import { compileSchema } from "@taxonic/core/schema";
import { ensureValidGetQuerySyntax } from "@taxonic/core/validation";
import { graphqlOperations } from "./graphql-operations.js";

export function GraphQLStore(rawSchema, config) {
  const schema = compileSchema(rawSchema);

  const get = (rawQuery) => {
    const { graphqlConfig, sendGraphqlRequest } = config;

    if (!graphqlConfig || !sendGraphqlRequest) {
      throw new TaxonicError(
        "GraphQLStore requires a graphql config and a transport to be passed in the config",
      );
    }

    const query = normalizeQuery(schema, rawQuery);
    const graphqlTypeConfig = graphqlConfig[query.type];

    const resolver = query.id
      ? graphqlTypeConfig.resolvers.one
      : graphqlTypeConfig.resolvers.all;

    // Each graphql resource type will be able to handle some args, but not all
    // on a type-by-type basis. Some of these may be subtypes, as in the case
    // of sorting and filtering (TODO).
    const graphqlTypeOperations = pick(
      graphqlOperations,
      graphqlTypeConfig.args ?? [],
    );

    const queryOperations = [
      ...Object.values(graphqlTypeOperations),
      graphqlOperations.properties,
    ];

    return compileQuery(query, {
      ...config,
      // debug: true,
      graphqlConfig,
      initStoreQuery: { args: {}, properties: [] },
      queryOperations,
      resultOperations: [],
      run: async (storeQuery, context) => {
        const { runVars } = context;

        const argsPairs = Object.entries(storeQuery.args).map(
          ([k, v]) => `${k}: ${v}`,
        );
        const argsString =
          storeQuery.args && Object.keys(storeQuery.args).length > 0
            ? `(${argsPairs.join(", ")})`
            : "";
        const gqlString = `query {
          ${resolver.name}${argsString} {
            ${storeQuery.properties.join("\n")}
          }
        }`;

        try {
          const { data } = await sendGraphqlRequest(
            gqlString,
            runVars.transportVars ?? {},
          );

          const rawData = data.data[resolver.name];

          return query.id ? [rawData] : rawData;
        } catch (e) {
          console.log("run error", e);
          return [];
        }
      },
      schema,
    });
  };

  return {
    async get(rawQuery) {
      ensureValidGetQuerySyntax(schema, rawQuery);
      return this.compileGetQuery(rawQuery)({});
    },
    compileGetQuery(rawQuery) {
      ensureValidGetQuerySyntax(schema, rawQuery);
      return get(rawQuery);
    },
  };
}
