"use strict";

function check(id, args, prerequisites = []) {
  return Object.freeze({
    id,
    command: "pnpm",
    args: Object.freeze(args),
    prerequisites: Object.freeze(prerequisites),
  });
}

function builtCheck(id, args, prerequisites = []) {
  return check(id, args, ["build", ...prerequisites]);
}

const PRE_BUILD_CHECKS = Object.freeze([
  check("workspace-quality-inventory", ["check:workspace-quality-inventory"]),
  check("markdown-links", ["check:markdown-links"]),
  check("mbt-driver-closure", ["check:mbt-driver-closure"]),
  check("qnt-proof-closure", ["check:qnt-proof-closure"]),
  check("qnt-proof-timing-report", ["check:qnt-proof-timing-report"]),
  check("test-lane-hygiene", ["check:test-lane-hygiene"]),
  check("mbt-script-inventory", ["check:mbt-script-inventory"]),
  check("qnt-inventory", ["check:qnt-inventory"]),
  check("qnt-run-block-separation", ["check:qnt-run-block-separation"]),
  check("rules-kernel-coverage", ["rules-kernel-coverage:check"]),
  check("spell-lifecycle-owner-manifest", [
    "spell-lifecycle-owner-manifest:check",
  ]),
  check("sdk-raw-integration-inventory", [
    "sdk-raw-integration-inventory:check",
  ]),
  check("character-sheet-runtime-split", [
    "check:character-sheet-runtime-split",
  ]),
  check("battle-runtime-import-ownership", [
    "check:battle-runtime-import-ownership",
  ]),
  check("battle-runtime-test-support-boundary", [
    "check:battle-runtime-test-support-boundary",
  ]),
  check("explicit-call-results-self-test", [
    "check:explicit-call-results:self-test",
  ]),
  check("authored-id-dispatch", ["check:authored-id-dispatch"]),
  check("resource-lock", ["check:resource-lock"]),
]);

const BUILD_DEPENDENT_CHECKS = Object.freeze([
  builtCheck("qnt-proof-harness", ["check:qnt-proof-harness"]),
  builtCheck("opaque-oracle-schema-sync", ["check:opaque-oracle-schema-sync"]),
  builtCheck("cleanroom-provenance", ["check:cleanroom-provenance"]),
  builtCheck("complexity-self-test", ["check:complexity:self-test"]),
  builtCheck("complexity", ["check:complexity"], ["complexity-self-test"]),
  builtCheck("opaque-oracle-corpus", ["check:opaque-oracle-corpus"]),
  builtCheck("raw-swarm-lane-hygiene", ["check:raw-swarm-lane-hygiene"]),
  builtCheck("duplication", ["duplication"]),
  builtCheck("surface-publication-typecheck", [
    "check:surface-publication-typecheck",
  ]),
  builtCheck("surface-publication-self-test", [
    "run",
    "check:surface-publication-self-test:body",
  ]),
  builtCheck(
    "surface-content-publication",
    ["check:surface-content-publication"],
    ["surface-publication-self-test"],
  ),
  builtCheck(
    "srd-stat-block-catalog",
    ["check:srd-stat-block-catalog"],
    ["surface-publication-self-test"],
  ),
  builtCheck("stat-block-procedure-pressure-self-test", [
    "check:stat-block-procedure-pressure:self-test",
  ]),
  builtCheck(
    "stat-block-procedure-pressure",
    ["check:stat-block-procedure-pressure"],
    ["stat-block-procedure-pressure-self-test"],
  ),
  builtCheck("stat-block-restricted-invocation-deltas-self-test", [
    "check:stat-block-restricted-invocation-deltas:self-test",
  ]),
  builtCheck(
    "stat-block-restricted-invocation-deltas",
    ["check:stat-block-restricted-invocation-deltas"],
    ["stat-block-restricted-invocation-deltas-self-test"],
  ),
  builtCheck("stat-block-execution-reconciliation-self-test", [
    "check:stat-block-execution-reconciliation:self-test",
  ]),
  builtCheck(
    "stat-block-execution-reconciliation",
    ["check:stat-block-execution-reconciliation"],
    ["stat-block-execution-reconciliation-self-test"],
  ),
  builtCheck("opaque-oracle-distribution", [
    "check:opaque-oracle-distribution",
  ]),
  builtCheck("unit-profile-coverage", ["unit-profile-coverage:check"]),
  builtCheck("circular", ["circular"]),
  builtCheck("lint", ["lint"], ["explicit-call-results-self-test"]),
  builtCheck("deployment-lifecycle", [
    "run",
    "smoke:deployment-lifecycle:body",
  ]),
  builtCheck("typecheck", ["run", "typecheck:turbo"]),
]);

const PRE_COVERAGE_CHECKS = Object.freeze([
  ...PRE_BUILD_CHECKS,
  check("build", ["run", "build:turbo"]),
  ...BUILD_DEPENDENT_CHECKS,
]);

function qualityMilestonePlan({ collectAll = false } = {}) {
  return Object.freeze([
    ...PRE_COVERAGE_CHECKS,
    check(
      "coverage",
      ["run", "coverage:body"],
      collectAll ? ["build"] : PRE_COVERAGE_CHECKS.map(({ id }) => id),
    ),
  ]);
}

const QUALITY_MILESTONE_PLAN = qualityMilestonePlan();
module.exports = { QUALITY_MILESTONE_PLAN, qualityMilestonePlan };
