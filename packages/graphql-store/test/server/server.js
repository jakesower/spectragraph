import { ApolloServer, gql } from "apollo-server";
import { careBearData } from "../fixtures/care-bear-data.js";
import { careBearSchema } from "../fixtures/care-bear-schema.js";
import { makeGraphqlSchema } from "./make-graphql-schema.js";

const typeDefs = gql(makeGraphqlSchema(careBearSchema));

const resolvers = {
  Query: Object.keys(careBearSchema.resources)
    .map((resName) => ({
      [`${resName}ById`]: ({ id }) => {
        console.log({id })
        return careBearData[resName][id]
      },
      [resName]: () => {
        console.log('xxxxxx')
        return Object.values(careBearData[resName])
      },
    }))
    .reduce((acc, item) => ({ ...acc, ...item }), {}),
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

server.listen(8000).then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
