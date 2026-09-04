"use strict";

function check(id, args, prerequisites = []) {
  return Object.freeze({
    id,
    command: "pnpm",
    args: Object.freeze(args),
    prerequisites: Object.freeze(prerequisites),
  });
}

const QUALITY_MILESTONE_PLAN = Object.freeze([
  check("effect4-cohort-self-test", ["check:effect4-cohort:self-test"]),
  check(
    "effect4-cohort",
    ["check:effect4-cohort"],
    ["effect4-cohort-self-test"],
  ),
  check("effect4-certification-typecheck", [
    "check:effect4-certification-typecheck",
  ]),
  check("effect4-oracle-delta-self-test", [
    "check:effect4-oracle-delta:self-test",
  ]),
  check(
    "effect4-oracle-delta",
    ["check:effect4-oracle-delta"],
    ["effect4-oracle-delta-self-test"],
  ),
  check("effect4-clean-consumer", ["smoke:effect4-clean-consumer"]),
  check("build", ["run", "build:turbo"]),
  check("workspace-quality-inventory", ["check:workspace-quality-inventory"]),
  check("authored-id-dispatch", ["check:authored-id-dispatch"]),
  check("battle-runtime-import-ownership", [
    "check:battle-runtime-import-ownership",
  ]),
  check("battle-runtime-test-support-boundary", [
    "check:battle-runtime-test-support-boundary",
  ]),
  check("character-sheet-runtime-split", [
    "check:character-sheet-runtime-split",
  ]),
  check("surface-publication-typecheck", [
    "check:surface-publication-typecheck",
  ]),
  check("surface-publication-self-test", [
    "run",
    "check:surface-publication-self-test:body",
  ]),
  check(
    "surface-content-publication",
    ["check:surface-content-publication"],
    ["surface-publication-self-test"],
  ),
  check(
    "srd-stat-block-catalog",
    ["check:srd-stat-block-catalog"],
    ["surface-publication-self-test"],
  ),
  check("stat-block-procedure-pressure-self-test", [
    "check:stat-block-procedure-pressure:self-test",
  ]),
  check(
    "stat-block-procedure-pressure",
    ["check:stat-block-procedure-pressure"],
    ["stat-block-procedure-pressure-self-test"],
  ),
  check("stat-block-restricted-invocation-deltas-self-test", [
    "check:stat-block-restricted-invocation-deltas:self-test",
  ]),
  check(
    "stat-block-restricted-invocation-deltas",
    ["check:stat-block-restricted-invocation-deltas"],
    ["stat-block-restricted-invocation-deltas-self-test"],
  ),
  check("stat-block-execution-reconciliation-self-test", [
    "check:stat-block-execution-reconciliation:self-test",
  ]),
  check(
    "stat-block-execution-reconciliation",
    ["check:stat-block-execution-reconciliation"],
    ["stat-block-execution-reconciliation-self-test"],
  ),
  check("opaque-oracle-schema-sync", ["check:opaque-oracle-schema-sync"]),
  check("opaque-oracle-corpus", ["check:opaque-oracle-corpus"]),
  check(
    "opaque-oracle-distribution",
    ["check:opaque-oracle-distribution"],
    ["build"],
  ),
  check("cleanroom-provenance", ["check:cleanroom-provenance"]),
  check("markdown-links", ["check:markdown-links"]),
  check("mbt-driver-closure", ["check:mbt-driver-closure"]),
  check("qnt-proof-closure", ["check:qnt-proof-closure"]),
  check("qnt-proof-harness", ["check:qnt-proof-harness"]),
  check("qnt-proof-timing-report", ["check:qnt-proof-timing-report"]),
  check("test-lane-hygiene", ["check:test-lane-hygiene"]),
  check("mbt-script-inventory", ["check:mbt-script-inventory"]),
  check("qnt-inventory", ["check:qnt-inventory"]),
  check("qnt-run-block-separation", ["check:qnt-run-block-separation"]),
  check("resource-lock", ["check:resource-lock"]),
  check("raw-swarm-lane-hygiene", ["check:raw-swarm-lane-hygiene"]),
  check("rules-kernel-coverage", ["rules-kernel-coverage:check"]),
  check("unit-profile-coverage", ["unit-profile-coverage:check"]),
  check("gh381-registry-path-manifest", ["gh381-registry-path-manifest:check"]),
  check("sdk-raw-integration-inventory", [
    "sdk-raw-integration-inventory:check",
  ]),
  check("lint", ["lint"]),
  check("complexity-self-test", ["check:complexity:self-test"]),
  check("complexity", ["check:complexity"], ["complexity-self-test"]),
  check("duplication", ["duplication"]),
  check("circular", ["circular"]),
  check("typecheck", ["run", "typecheck:turbo"]),
  check("test", ["run", "test:turbo"]),
  check("coverage", ["run", "coverage:body"]),
]);

module.exports = { QUALITY_MILESTONE_PLAN };
