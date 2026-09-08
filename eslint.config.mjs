import js from "@eslint/js";
import globals from "globals";
import prettierConfig from "eslint-config-prettier";
import tseslint from "typescript-eslint";
import explicitCallResults from "./scripts/eslint-rules/explicit-call-results.mjs";

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
  {
    files: [
      "packages/battle-runtime/src/battle-reducer/attack-damage-ability-modifier-choice.ts",
      "packages/battle-runtime/src/battle-reducer/attack-main.ts",
      "packages/battle-runtime/src/battle-reducer/attack-offhand.ts",
      "packages/battle-runtime/src/battle-reducer/attack-resolution.ts",
      "packages/battle-runtime/src/battle-reducer/damage-helpers.ts",
      "packages/battle-runtime/src/battle-reducer/opportunity-attacks.ts",
      "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/spell-cast-interruption-reaction.ts",
      "packages/battle-runtime/src/battle-reducer/spells-resolve-area-effects.ts",
      "packages/battle-runtime/src/battle-reducer/spells-resolve-attack-burst.ts",
      "packages/battle-runtime/src/battle-reducer/spells-resolve-save-gates.ts",
      "packages/battle-runtime/src/battle-reducer/spells-resolve-target-selection.ts",
      "packages/battle-runtime/src/battle-reducer/triggered-reaction-spell-procedures.ts",
      "packages/battle-runtime/src/battle-reducer/willing-target-save-gate.ts",
    ],
    languageOptions: { parserOptions: { projectService: true } },
    plugins: { dnd: explicitCallResults },
    rules: { "dnd/explicit-call-results": "error" },
  },
  prettierConfig,
];
