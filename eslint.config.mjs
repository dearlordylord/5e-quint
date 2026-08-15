import js from "@eslint/js";
import globals from "globals";
import prettierConfig from "eslint-config-prettier";
import tseslint from "typescript-eslint";

import appConfig from "./packages/app/eslint.config.mjs";
import mcpConfig from "./packages/mcp/eslint.config.mjs";
import surfaceConfig from "./packages/surface/eslint.config.mjs";

const TYPESCRIPT_FILES = ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"];
const JAVASCRIPT_FILES = ["**/*.js", "**/*.mjs", "**/*.cjs"];

const doubleAssertionSelector = {
  selector: "TSAsExpression > TSAsExpression",
  message: "Double type assertion (as A as B) is forbidden.",
};

function scopedConfig(config, root) {
  return config.map((entry) => ({
    ...entry,
    ...(entry.files === undefined
      ? {}
      : { files: entry.files.map((pattern) => `${root}/${pattern}`) }),
    ...(entry.ignores === undefined
      ? {}
      : { ignores: entry.ignores.map((pattern) => `${root}/${pattern}`) }),
  }));
}

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/*.gen.*",
      ".output/**",
      ".quint-cache/**",
      ".references/**",
      "scripts/raw-swarm/out/**",
      ".turbo/**",
      ".worktrees/**",
      "_apalache-out/**",
    ],
  },
  {
    ...js.configs.recommended,
    files: JAVASCRIPT_FILES,
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      globals: globals.node,
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": ["error", { ignoreRestSiblings: true }],
    },
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: TYPESCRIPT_FILES,
  })),
  {
    files: TYPESCRIPT_FILES,
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { ignoreRestSiblings: true },
      ],
      "no-restricted-syntax": ["error", doubleAssertionSelector],
    },
  },
  ...scopedConfig(appConfig, "packages/app"),
  ...scopedConfig(mcpConfig, "packages/mcp"),
  ...scopedConfig(surfaceConfig, "packages/surface"),
  {
    files: ["packages/{mcp,surface}/**/*.{ts,tsx,mts,cts,js,mjs,cjs}"],
    linterOptions: {
      noInlineConfig: true,
    },
  },
  prettierConfig,
];
