import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      exclude: ["src/index.js", "**/*.d.ts", "dist/**", "**/*.config.js"],
    },
  },
});