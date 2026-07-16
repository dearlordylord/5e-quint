import { defineConfig } from "vitest/config";

// Sheet tests construct fresh session values and do not rely on module resets.
// Sharing one module cache avoids collecting the same runtime graph per file.
export default defineConfig({
  test: {
    isolate: false,
  },
});
