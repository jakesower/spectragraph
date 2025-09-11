import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		coverage: {
			exclude: [
				"src/index.js",
				"examples/**",
				"node_modules/**",
				"dist/**",
				"test/**",
				"**/*.d.ts",
				"**/*.config.js",
				"scripts/**",
			],
		},
	},
});
