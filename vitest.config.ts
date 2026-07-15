import { defineConfig } from "vitest/config";

// DND_ROOT_VITEST_RESOURCE_PROTOCOL: pool-independent-v1
// Root-level Vitest commands are commonly used for scripts and integration
// checks. Packages without their own config inherit this pool-independent
// worker bound; packages with a local config continue to own their settings.
export default defineConfig({
  test: {
    maxWorkers: 1,
  },
});
