import tseslintParser from "@typescript-eslint/parser";

import {
  CYCLOMATIC_COMPLEXITY_THRESHOLD,
  CYCLOMATIC_COMPLEXITY_VARIANT,
} from "./scripts/cyclomatic-complexity-policy.mjs";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/*.gen.*",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/*.spec.tsx",
      "**/*.mbt.test.ts",
      "**/*.test-support.ts",
      "**/*.qnt-replay.test-support.ts",
      "**/*.replay-data.test-support.ts",
    ],
  },
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: { parser: tseslintParser },
    linterOptions: { noInlineConfig: true },
    rules: {
      complexity: [
        "error",
        {
          max: CYCLOMATIC_COMPLEXITY_THRESHOLD,
          variant: CYCLOMATIC_COMPLEXITY_VARIANT,
        },
      ],
    },
  },
];
