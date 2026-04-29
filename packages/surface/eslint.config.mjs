import tsParser from "@typescript-eslint/parser"
import prettierConfig from "eslint-config-prettier"

export default [
  {
    ignores: ["**/dist", "**/build", "**/*.gen.*", "content/**"]
  },
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      sourceType: "module"
    },
    rules: {}
  },
  prettierConfig
]
