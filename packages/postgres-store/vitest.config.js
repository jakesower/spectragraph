import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
	test: {
		globalSetup: [path.resolve("./test/global-setup.js")],
		globalTeardown: [path.resolve("./test/global-setup.js")],
		include: ["test/**/*.test.js"],
		exclude: ["test/**/*.test.ts"],
		testTimeout: 30000, // Allow more time for container operations
		hookTimeout: 30000, // Allow more time for setup/teardown
		pool: "forks",
		poolOptions: {
			forks: {
				singleFork: true,
			},
		},
	},
});