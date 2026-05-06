import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ["./tsconfig.json"] })],
  test: {
    globals: false,
    // Core MBT files spawn Quint subprocesses and are intentionally single-run.
    fileParallelism: false,
  },
})
