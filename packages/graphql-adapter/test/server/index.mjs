import express from "express";
import { adaptRequest } from "../../src/request.mjs";
import { adaptResponse } from "../../src/response.mjs";

const app = express();

app.use("/graphql", (req, res, next) => {
  console.log(req);
  adaptRequest();
  const res = next();
  return adaptResponse();
})

app.post("/graphql", (req, res) => res.send("hi"));

app.listen(8000, () => {
  console.log("test server running");
});
