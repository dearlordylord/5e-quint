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
      include: ["src/**"],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.config.ts",
        "**/*.gen.*",
        "src/router.tsx",
        "src/routes/**",
        ".tanstack/**"
      ],
      thresholds: {
        lines: 95,
        functions: 83,
        branches: 96,
        statements: 95
      }
    }
  }
})
