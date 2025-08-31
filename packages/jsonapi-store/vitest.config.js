import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      exclude: [
        "node_modules/**",
        "dist/**",
        "test/**",
        "**/*.d.ts",
        "**/*.config.js",
        "scripts/**",
        "src/index.js"
      ],
    },
  },
});