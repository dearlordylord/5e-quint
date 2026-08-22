import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ["./tsconfig.json"] })],
  test: {
    exclude: ["**/node_modules/**", "**/dist/**"],
    globals: false,
    // Tests construct fresh composition roots and close their transports.
    // Sharing the module cache avoids recollecting the runtime schema graph.
    isolate: false,
    // Schema validation and protocol fixtures share that graph; concurrent
    // coverage workers can push the existing 30-second test budget over its
    // boundary. Keep this package on the repository's single-worker bound.
    maxWorkers: 1,
  },
});
