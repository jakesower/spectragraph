import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";

export default [
	// ESM build
	{
		input: "src/index.js",
		output: { file: "dist/index.esm.js", format: "es" },
		plugins: [nodeResolve(), commonjs(), json()],
		external: [
			"lodash-es",
			"@data-prism/core",
			"@data-prism/utils",
		],
	},
	// CommonJS build
	{
		input: "src/index.js",
		output: { file: "dist/index.cjs.js", format: "cjs" },
		plugins: [nodeResolve(), commonjs(), json()],
		external: [
			"lodash-es",
			"@data-prism/core",
			"@data-prism/utils",
		],
	},
];