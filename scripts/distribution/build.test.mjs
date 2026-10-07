import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import ts from "typescript";
import { root } from "./packages.mjs";
import { rewriteSdkOutput, sdkCompilerOptions } from "./build.mjs";

const options = ts.convertCompilerOptionsFromJson(
  sdkCompilerOptions,
  root,
).options;
const host = ts.createCompilerHost(options);
const original = resolve(root, "packages/battle-runtime/src/index.ts");

test("native SDK configuration retains strict production emit options", () => {
  assert.deepEqual(sdkCompilerOptions, {
    target: "ES2022",
    module: "ESNext",
    moduleResolution: "Bundler",
    strict: true,
    exactOptionalPropertyTypes: true,
    skipLibCheck: true,
    declaration: true,
    allowImportingTsExtensions: true,
    rewriteRelativeImportExtensions: true,
    resolveJsonModule: true,
    rootDir: resolve(root, "packages"),
    outDir: resolve(root, "dist/npm/sdk/dist"),
    types: [],
    noEmitOnError: true,
  });
});

test("emitted JavaScript rewrites workspace imports using the original source location", () => {
  const text = rewriteSdkOutput(
    'export { unitId } from "@dnd/shared/game-facts";\nimport x from "effect";',
    original,
    options,
    host,
  );
  assert.match(text, /from "\.\.\/\.\.\/shared\/src\/game-facts\.js"/);
  assert.match(text, /from "effect"/);
});

test("declaration exports and import types retain the same workspace topology", () => {
  const text = rewriteSdkOutput(
    'export type { UnitId } from "@dnd/shared/game-facts";\nexport type Selected = import("@dnd/shared/game-facts").UnitId;',
    original,
    options,
    host,
  );
  assert.equal(
    (text.match(/\.\.\/\.\.\/shared\/src\/game-facts\.js/g) ?? []).length,
    2,
  );
});

test("JSON imports gain ESM attributes without changing their destination", () => {
  const text = rewriteSdkOutput(
    'import data from "./synthetic.json";\nexport { data };',
    original,
    options,
    host,
  );
  assert.match(text, /from "\.\/synthetic\.json" with \{ type: "json" \}/);
});
