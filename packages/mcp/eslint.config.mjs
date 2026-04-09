import tsParser from "@typescript-eslint/parser"
import prettierConfig from "eslint-config-prettier"

export default [
  {
    ignores: ["**/dist", "**/build", "**/*.gen.*"]
  },
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      sourceType: "module"
    },
    rules: {
      "max-lines": ["error", { max: 420, skipBlankLines: true, skipComments: true }]
    }
  },
  {
    files: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    rules: {
      "max-lines": "off"
    }
  },
  prettierConfig
]
