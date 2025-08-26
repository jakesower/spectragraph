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
			"lodash-es",
			"@data-prism/utils",
			"data-prism",
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
			"lodash-es",
			"@data-prism/utils",
			"data-prism",
			"ajv",
			"pg",
		],
	},
];