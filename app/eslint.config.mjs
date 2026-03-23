import { fixupPluginRules } from "@eslint/compat"
import tsParser from "@typescript-eslint/parser"
import functional from "eslint-plugin-functional"
import _import from "eslint-plugin-import"
import reactHooks from "eslint-plugin-react-hooks"
import simpleImportSort from "eslint-plugin-simple-import-sort"
import sortDestructureKeys from "eslint-plugin-sort-destructure-keys"
import prettierConfig from "eslint-config-prettier"
import tseslint from "typescript-eslint"

const doubleAssertionSelector = {
  selector: "TSAsExpression > TSAsExpression",
  message: "Double type assertion (as A as B). Requires eslint-disable with justification."
}

export default [
  {
    ignores: ["**/dist", "**/build", "**/*.gen.*", "**/.tanstack", "**/.vinxi", "**/.output"]
  },

  // TypeScript recommended
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["src/**/*.ts", "src/**/*.tsx"]
  })),

  {
    files: ["src/**/*.ts", "src/**/*.tsx"],

    plugins: {
      functional,
      import: fixupPluginRules(_import),
      "simple-import-sort": simpleImportSort,
      "sort-destructure-keys": sortDestructureKeys,
      "react-hooks": fixupPluginRules(reactHooks)
    },

    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: { jsx: true }
      }
    },

    settings: {
      "import/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx"]
      },
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true
        }
      }
    },

    rules: {
      // Import organization
      "import/first": "error",
      "import/no-duplicates": "error",
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",

      // TypeScript best practices
      "@typescript-eslint/consistent-type-imports": "warn",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        {
          assertionStyle: "as",
          objectLiteralTypeAssertions: "allow-as-parameter"
        }
      ],
      "@typescript-eslint/array-type": ["warn", { default: "generic", readonly: "generic" }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/no-unnecessary-condition": "error",

      // React hooks
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Code quality
      "object-shorthand": "error",
      "sort-destructure-keys/sort-destructure-keys": "error",
      "max-lines": ["error", { max: 420, skipBlankLines: true, skipComments: true }],
      "no-console": "warn",
      "no-magic-numbers": [
        "warn",
        {
          ignore: [0, 1],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          enforceConst: true
        }
      ],
      "no-restricted-syntax": ["error", doubleAssertionSelector],

      // Functional programming (cherry-picked from recommended)
      "functional/no-mixed-types": "error",
      "functional/prefer-tacit": "error",
      "functional/immutable-data": "warn"
    }
  },

  // Test file overrides
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts"],
    rules: {
      "max-lines": "off",
      "no-magic-numbers": "off",
      "functional/immutable-data": "off"
    }
  },

  // Prettier compatibility (disables formatting rules)
  prettierConfig
]
