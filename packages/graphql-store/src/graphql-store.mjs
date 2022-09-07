import { BlossomError } from "@blossom/core/errors";
import { runQuery } from "@blossom/core/operations";
import { compileQuery, normalizeGetQuery } from "@blossom/core/query";
import { compileSchema } from "@blossom/core/schema";
import { ensureValidGetQuerySyntax } from "@blossom/core/validation";

export function GraphQLStore(rawSchema, config) {
  const schema = compileSchema(rawSchema);

  const get = (rawQuery) => {
    const { resolverMap, transport } = config;

    if (!resolverMap || !transport) {
      throw new BlossomError(
        "GraphQLStore requires a resolver map and a transport to be passed in the config",
      );
    }

    const query = normalizeGetQuery(schema, rawQuery);
    const resDef = schema.resources[query.type];

    const gqlProps = [resDef.idField, ...query.properties];
    const gqlTopResolver = resolverMap[query.type].all.name;

    const gqlString = `query {
      ${gqlTopResolver} {
        ${gqlProps.join("\n")}
      }
    }`;

    const compiledQuery = compileQuery(query, {
      ...config,
      run: async () => {
        const { data } = await transport.post("", { query: gqlString });
        return data.data[gqlTopResolver];
      },
    });

    return compiledQuery();
  };

  return {
    async get(rawQuery) {
      ensureValidGetQuerySyntax(schema, rawQuery);
      return get(rawQuery);
    },
  };
}
