import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ["./tsconfig.json"] })],
  test: {
    exclude: ["src/legacy-core/**", "**/node_modules/**", "**/dist/**"],
    globals: false,
  },
})
