import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";

export default [
	// ESM build
	{
		input: "src/sqlite-store.js",
		output: { file: "dist/index.esm.js", format: "es" },
		plugins: [nodeResolve(), commonjs(), json()],
		external: [
			"es-toolkit",
			"@spectragraph/utils",
			"better-sqlite3",
			"spectragraph",
		],
	},
	// CommonJS build
	{
		input: "src/sqlite-store.js",
		output: { file: "dist/index.cjs.js", format: "cjs" },
		plugins: [nodeResolve(), commonjs(), json()],
		external: [
			"es-toolkit",
			"@spectragraph/utils",
			"better-sqlite3",
			"spectragraph",
		],
	},
];