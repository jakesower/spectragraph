import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";

export default {
	input: "src/index.js",
	external: ["@spectragraph/core", "@spectragraph/utils", "es-toolkit"],
	output: [
		{
			file: "dist/index.cjs.js",
			format: "cjs",
			exports: "named",
		},
		{
			file: "dist/index.esm.js",
			format: "es",
		},
	],
	plugins: [
		nodeResolve({
			preferBuiltins: true,
		}),
		commonjs(),
		json(),
	],
};