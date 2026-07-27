import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ["./tsconfig.json"] })],
  test: {
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["**/*.test.ts", "**/*.test.tsx", "**/*.config.ts", "**/*.d.ts", "**/*.gen.*"],
      thresholds: {
        lines: 99,
        functions: 99,
        // Temporary measured non-regression floor; issue #227's target remains 99%.
        branches: 98,
        statements: 99
      }
    }
  }
})
