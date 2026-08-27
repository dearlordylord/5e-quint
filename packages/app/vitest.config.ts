import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

import { SHARED_HOST_TEST_TIMEOUT_MILLISECONDS } from "./test-timeout.ts"

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ["./tsconfig.json"] })],
  test: {
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    testTimeout: SHARED_HOST_TEST_TIMEOUT_MILLISECONDS,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["**/*.test.ts", "**/*.test.tsx", "**/*.config.ts", "**/*.d.ts", "**/*.gen.*"],
      thresholds: {
        lines: 99,
        functions: 99,
        branches: 99,
        statements: 99
      }
    }
  }
})
