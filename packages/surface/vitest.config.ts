import { defineConfig } from "vitest/config"

// Surface schema tests load the full authored catalog and may compile its
// generated JSON Schema. Running multiple workers duplicates that large object
// graph and can exhaust the host before Vitest reports a useful failure.
// Keep the bound package-local so direct invocations and wrapper scripts share
// the same resource behavior.
export default defineConfig({
  test: {
    maxWorkers: 1,
    pool: "threads",
  },
})
