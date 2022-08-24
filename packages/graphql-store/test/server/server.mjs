import express from "express";
import { graphqlHTTP } from "express-graphql";
import { buildSchema } from "graphql";
import { careBearData } from "../fixtures/care-bear-data.mjs";
import { careBearSchema } from "../fixtures/care-bear-schema.mjs";
import { makeGraphqlSchema } from "./make-graphql-schema.mjs";

const schema = buildSchema(makeGraphqlSchema(careBearSchema));

const rootResolvers = Object.entries(careBearSchema.resources)
  .map(([resName, resDef]) => ({
    [`${resName}ById`]: ({ id }) => {
      const out = careBearData[resName][id];
      console.log({ id, out });
      return out;
    },
    [resName]: (...args) => {
      console.log(resName, careBearData[resName]);
      return Object.values(careBearData[resName]);
    },
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
