import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globalSetup: "./test/global-setup.js",
		include: ["test/**/*.test.js"],
		exclude: ["test/**/*.test.ts"],
		testTimeout: 30000, // Allow more time for container operations
		hookTimeout: 30000, // Allow more time for setup/teardown
	},
});