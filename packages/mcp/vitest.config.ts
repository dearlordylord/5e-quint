import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

import { SHARED_HOST_TEST_TIMEOUT_MILLISECONDS } from "../../scripts/shared-host-test-policy.mjs";

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ["./tsconfig.json"] })],
  test: {
    exclude: ["**/node_modules/**", "**/dist/**"],
    globals: false,
    // Tests construct fresh composition roots and close their transports.
    // Sharing the module cache avoids recollecting the runtime schema graph.
    isolate: false,
    // Schema validation and protocol fixtures share that graph. Keep this
    // package on the repository's single-worker bound under shared-host load.
    maxWorkers: 1,
    testTimeout: SHARED_HOST_TEST_TIMEOUT_MILLISECONDS,
  },
});
