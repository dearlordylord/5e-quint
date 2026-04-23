import tsParser from "@typescript-eslint/parser"
import prettierConfig from "eslint-config-prettier"
import tseslint from "typescript-eslint"

export default [
  {
    ignores: ["**/dist", "**/build", "**/*.gen.*"]
  },

  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["src/**/*.ts"]
  })),

  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-unnecessary-condition": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error"
    }
  },

  {
    files: ["**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-unnecessary-condition": "off"
    }
  },

  prettierConfig
]
