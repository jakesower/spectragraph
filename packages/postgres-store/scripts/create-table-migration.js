import { readFileSync } from "node:fs";
import { createTablesSQL } from "./seed.js";

const [schemaPath, configPath] = [process.argv[2], process.argv[3]];

if (!schemaPath || !configPath) {
	console.log("Usage: node ./seed.js path-to-schema path-to-config");
	throw new Error("Usage: node ./seed.js path-to-schema path-to-config");
}

const schema = JSON.parse(readFileSync(schemaPath, { encoding: "utf8" }));
const config = JSON.parse(readFileSync(configPath, { encoding: "utf8" }));

console.log(createTablesSQL(schema, config).join("\n"));
