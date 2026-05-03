import tsParser from "@typescript-eslint/parser";
import prettierConfig from "eslint-config-prettier";

const maxLinesRule = (max) => [
  "error",
  { max, skipBlankLines: true, skipComments: true },
];

export default [
  {
    ignores: ["**/dist", "**/build", "**/*.gen.*"],
  },
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      sourceType: "module",
    },
    rules: {
      "max-lines": maxLinesRule(420),
    },
  },
  {
    files: [
      "src/available-actions.ts",
      "src/battle-machine-actions-attack.ts",
      "src/features/spell-registry.ts",
      "src/mbt-shared.ts",
      "src/battle-machine-helpers.ts",
      "src/context-encoding.ts",
      "src/machine.ts",
      "src/machine-guards.ts",
      "src/machine-states.ts",
      "src/demo/fireball-battle.ts",
      "src/features/class-barbarian.ts",
      "src/features/class-sorcerer.ts",
      "src/features/class-druid.ts",
      "src/battle-machine-actions-turn.ts",
      "src/features/class-rogue.ts",
      "src/features/feature-bridge.ts",
      "src/machine-types.ts",
      "src/types.ts",
      "src/machine-helpers.ts",
      "src/battle-machine-creature.ts",
      "src/character-open-choice-payload.ts",
    ],
    rules: {
      "max-lines": "off",
    },
  },
  {
    files: ["src/**/*.test.ts", "src/**/*.spec.ts", "src/**/*.mbt.test.ts"],
    rules: {
      "max-lines": "off",
    },
  },
  prettierConfig,
];
