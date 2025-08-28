import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default [
	// ESM build
	{
		input: "src/index.js",
		output: { file: "dist/index.esm.js", format: "es" },
		plugins: [nodeResolve(), commonjs()],
		external: [
			"es-toolkit",
			"@data-prism/utils",
			"ajv",
			"ajv-formats",
			"uuid"
		],
	},
	// CommonJS build
	{
		input: "src/index.js",
		output: { file: "dist/index.cjs.js", format: "cjs" },
		plugins: [nodeResolve(), commonjs()],
		external: [
			"es-toolkit",
			"@data-prism/utils",
			"ajv",
			"ajv-formats",
			"uuid"
		],
	},
];
