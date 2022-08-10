import { normalizeGetQuery, runQuery } from "@blossom/core/query";
import { BlossomError } from "./errors.mjs";

export function GraphQLStore(schema, config) {
  return {
    async get(rawQuery) {
      const { resolverMap, transport } = config;

      if (!resolverMap || !transport) {
        throw new BlossomError("you must pass a resolver map into GraphQLStore");
      }

      const query = normalizeGetQuery(schema, rawQuery);

      const gqlProps = ["id", ...query.properties];
      const gqlTopRes = `${query.type}ById`;
      const gqlTopArgs = { id: query.id };
      const gqlArgStr = Object.entries(gqlTopArgs).map(
        ([key, val]) => `${key}: "${val}"`,
      );

      const gqlString = `query {
        ${gqlTopRes}(${gqlArgStr}) {
          ${gqlProps.join("\n")}
        }
      }`;

      return runQuery(query, config, async (queryClauses) => {
        const gqlProps = ["id", ...query.properties];
        const gqlTopRes = `${query.type}ById`;
        const gqlTopArgs = { id: query.id };
        const gqlArgStr = Object.entries(gqlTopArgs).map(
          ([key, val]) => `${key}: "${val}"`,
        );

        const gqlQuery = `
          ${resolverMap[subQuery.type[cardinality.cardinality]]} {
            ${subQuery.properties.join("\n ")}
            ${Object.values(children).join("\n ")}
          }
        `;

        const result = await transport.get({ gqlQuery });

        return result.data;
      });

      // old
      // const query = normalizeGetQuery(schema, rawQuery);

      // const gqlProps = ["id", ...query.properties];
      // const gqlTopRes = `${query.type}ById`;
      // const gqlTopArgs = { id: query.id };
      // const gqlArgStr = Object.entries(gqlTopArgs).map(
      //   ([key, val]) => `${key}: "${val}"`,
      // );

      // const gqlString = `query {
      //   ${gqlTopRes}(${gqlArgStr}) {
      //     ${gqlProps.join("\n")}
      //   }
      // }`;

      // console.log(JSON.stringify({ query: gqlString, variables: {} }));
      // // const gqlQuery = gql("gstr", gqlString);

      // try {
      //   const response = await transport({
      //     data: JSON.stringify({ query: gqlString, variables: {} }),
      //     method: "post",
      //   });

      //   return response.data.data[gqlTopRes];
      // } catch (e) {
      //   return e.response.data;
      // }
    },
  };
}
