const path = require("node:path");

const coverageDirName = "rules-kernel-coverage";

const obligationStatuses = new Set([
  "covered",
  "needs-qnt-owner",
  "needs-parity-witness",
  "needs-surface-evidence",
  "boundary-only",
  "unsupported-by-admission",
]);

const coveredStatuses = new Set(["covered"]);
const nonSemanticStatuses = new Set([
  "boundary-only",
  "unsupported-by-admission",
]);

const runtimes = new Set([
  "shared-algebras",
  "battle",
  "character-creation",
  "character-sheet",
  "character-battle",
]);

const obligationKinds = new Set([
  "state-transition",
  "resource-sequencing",
  "hole-frontier",
  "reaction-continuation",
  "active-effect-lifecycle",
  "profile-procedure",
  "composition",
  "projection-scalar",
  "boundary-protocol",
]);

const parityWitnessKinds = new Set([
  "focused-mbt",
  "deterministic-qnt-replay",
]);

const generatorReadinessStatuses = new Set([
  "not-assessed",
  "fixture-bound",
  "semantic-core-candidate",
  "generation-subset-clean",
  "blocked",
]);

const markerKinds = new Set([
  "qnt-owner",
  "runtime-owner",
  "parity-witness",
  "boundary-owner",
]);

const skippedScanDirs = new Set([
  ".git",
  ".ralph",
  ".turbo",
  ".worktrees",
  "coverage",
  "dist",
  "node_modules",
  "test-results",
]);

function coveragePaths(root) {
  const coverageDir = path.join(root, "plans", coverageDirName);
  return {
    coverageDir,
    readme: path.join(coverageDir, "README.md"),
    obligations: path.join(coverageDir, "obligations.jsonl"),
    profileObligations: path.join(coverageDir, "profile-obligations.jsonl"),
    generatorReadiness: path.join(coverageDir, "generator-readiness.jsonl"),
    matrix: path.join(coverageDir, "matrix.json"),
    report: path.join(coverageDir, "REPORT.md"),
    stage3Plan: path.join(coverageDir, "STAGE3_CLOSURE_PLAN.md"),
    unitProfiles: path.join(
      root,
      "plans",
      "unit-profile-coverage",
      "profiles.jsonl",
    ),
  };
}

module.exports = {
  coveragePaths,
  coveredStatuses,
  generatorReadinessStatuses,
  markerKinds,
  nonSemanticStatuses,
  obligationKinds,
  obligationStatuses,
  parityWitnessKinds,
  runtimes,
  skippedScanDirs,
};
