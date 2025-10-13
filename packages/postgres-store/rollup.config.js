import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";

export default [
	// ESM build
	{
		input: "src/postgres-store.js",
		output: { file: "dist/postgres-store.esm.js", format: "es" },
		plugins: [nodeResolve(), commonjs(), json()],
		external: [
			"es-toolkit",
			"@spectragraph/utils",
			"@spectragraph/sql-helpers",
			"@spectragraph/core",
			"@spectragraph/query-helpers",
			"spectragraph",
			"ajv",
			"pg",
		],
	},
	// CommonJS build
	{
		input: "src/postgres-store.js",
		output: { file: "dist/postgres-store.cjs.js", format: "cjs" },
		plugins: [nodeResolve(), commonjs(), json()],
		external: [
			"es-toolkit",
			"@spectragraph/utils",
			"@spectragraph/sql-helpers",
			"@spectragraph/core",
			"@spectragraph/query-helpers",
			"spectragraph",
			"ajv",
			"pg",
		],
	},
];