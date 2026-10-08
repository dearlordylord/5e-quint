import assert from "node:assert/strict";
import { test } from "node:test";
import { affectedPackages, typecheckExitCode } from "./affected-typecheck.mjs";

const packages = [
  { name: "core", directory: "packages/core", dependencies: [] },
  { name: "consumer", directory: "packages/consumer", dependencies: ["core"] },
  { name: "app", directory: "packages/app", dependencies: ["consumer"] },
  { name: "independent", directory: "packages/independent", dependencies: [] },
];

test("shared source changes include transitive consumers", () => {
  assert.deepEqual(
    affectedPackages(packages, ["packages/core/src/types.ts"]).map(
      ({ name }) => name,
    ),
    ["core", "consumer", "app"],
  );
});
test("changed test files include their owning package and consumers", () => {
  assert.deepEqual(
    affectedPackages(packages, ["packages/consumer/src/check.test.ts"]).map(
      ({ name }) => name,
    ),
    ["consumer", "app"],
  );
});
test("root configuration and unknown ownership fail closed to all packages", () => {
  for (const path of [
    "tsconfig.json",
    "packages/unknown/src/check.ts",
    "scripts/check.mjs",
  ])
    assert.deepEqual(affectedPackages(packages, [path]), packages);
});
test("no changes require no package checks", () => {
  assert.deepEqual(affectedPackages(packages, []), []);
});

test("typecheck failures and changed inputs cannot pass; emergency outcomes retain 137", () => {
  assert.equal(typecheckExitCode({ status: 0 }, true), 0);
  assert.equal(typecheckExitCode({ status: 0 }, false), 1);
  assert.equal(typecheckExitCode({ status: 2 }, true), 1);
  assert.equal(typecheckExitCode({ status: 137 }, true), 137);
  assert.equal(
    typecheckExitCode({ status: null, signal: "SIGKILL" }, false),
    137,
  );
});
