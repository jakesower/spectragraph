import express from "express";
import { graphqlHTTP } from "express-graphql";
import { buildSchema } from "graphql";
import { careBearData } from "../fixtures/care-bear-data.js";
import { careBearSchema } from "../fixtures/care-bear-schema.js";
import { makeGraphqlSchema } from "./make-graphql-schema.js";

const schema = buildSchema(makeGraphqlSchema(careBearSchema));

const rootResolvers = Object.keys(careBearSchema.resources)
  .map((resName) => ({
    [`${resName}ById`]: ({ id }) => careBearData[resName][id],
    [resName]: () => Object.values(careBearData[resName]),
  }))
  .reduce((acc, item) => ({ ...acc, ...item }), {});

const app = express();
app.use(
  "/graphql",
  graphqlHTTP({
    schema,
    rootValue: rootResolvers,
    graphiql: true,
  }),
);
app.listen(4000);
console.log("Running a GraphQL API server at http://localhost:4000/graphql");
