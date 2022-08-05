import express from "express";

const app = express();

app.get("/", (req, res) => res.send("hi"));

app.listen(8000, () => {
  console.log("test server running");
});
