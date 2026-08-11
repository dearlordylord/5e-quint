export const PRODUCTION_TYPESCRIPT_INCLUDE = "src/**/*.{ts,tsx}";

export const NON_PRODUCTION_TYPESCRIPT_GLOBS = [
  "**/*.test.ts",
  "**/*.test.tsx",
  "**/*.spec.ts",
  "**/*.spec.tsx",
  "**/*.mbt.test.ts",
  "**/*.test-support.ts",
  "**/*.qnt-replay.test-support.ts",
  "**/*.replay-data.test-support.ts",
  "**/*.gen.*",
];

export function sourceGlobsUnder(sourceRoot) {
  return NON_PRODUCTION_TYPESCRIPT_GLOBS.map(
    (glob) => `${sourceRoot}/${glob.slice(3)}`,
  );
}
