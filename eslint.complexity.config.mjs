import tseslintParser from "@typescript-eslint/parser";

import {
  CYCLOMATIC_COMPLEXITY_IGNORES,
  CYCLOMATIC_COMPLEXITY_THRESHOLD,
  CYCLOMATIC_COMPLEXITY_VARIANT,
} from "./scripts/cyclomatic-complexity-policy.mjs";

export default [
  {
    ignores: CYCLOMATIC_COMPLEXITY_IGNORES,
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
