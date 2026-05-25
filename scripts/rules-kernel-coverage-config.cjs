const path = require("node:path");
const {
  parityWitnessKinds,
} = require("./evidence-witness-kind-config.cjs");

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

const battleFrontierSubjects = new Set([
  "battle-hole-family",
  "battle-fill-kind",
]);

const battleFrontierClassifications = new Set([
  "semantic-frontier",
  "deterministic-boundary-projection",
  "table-owned-fact",
  "unsupported-dead-branch",
]);

const generatorReadinessStatuses = new Set([
  "not-assessed",
  "fixture-bound",
  "semantic-core-candidate",
  "generation-subset-clean",
  "blocked",
]);

const generatorSubsetVocabulary = {
  "all-block": "`all { ... }` expression blocks.",
  arithmetic: "Integer arithmetic operators.",
  "boolean-connective": "`and`, `or`, or `not`.",
  bool: "Boolean literals or typed Boolean fields.",
  comparison: "Equality or ordering comparisons.",
  "constant-def": "Zero-argument pure definitions used as constants.",
  "constant-val": "Top-level `val` bindings used as module constants.",
  exists: "Collection `.exists(...)` existential checks.",
  filter: "Collection `.filter(...)`.",
  fold: "Collection `.fold(...)`.",
  "if-expression": "Conditional expressions.",
  import: "Cross-module imports.",
  implies: "Implication expressions.",
  int: "Integer literals, parameters, or fields.",
  "let-binding": "Local `val` bindings.",
  list: "`List[...]` types or values.",
  map: "Collection `.map(...)`.",
  membership: "`.in(...)`, `.contains(...)`, or equivalent membership checks.",
  "pattern-match": "`match` expressions over variants.",
  "pure-def": "Pure definitions intended as executable rule functions.",
  range: "Integer `.to(...)` ranges.",
  record: "Record types or record values.",
  "record-update": "Record `.with(...)` update expressions.",
  set: "`Set[...]` types or values.",
  "set-operators": "Set union or similar set algebra operators.",
  variant: "Tagged union variants.",
};

const generatorReadinessBlockerVocabulary = {
  "bridge-projection-coupled":
    "Semantic facts are mixed with bridge or projection shape that is not itself the future generator input.",
  "fixture-world-coupled":
    "Semantic facts depend on a bounded fixture world, closed case table, or named actor/content sample.",
  "mbt-harness-coupled":
    "Semantic facts are mixed with MBT variables, trace actions, or replay harness protocol.",
  "proof-obligation-coupled":
    "Semantic facts are mixed with induction, invariant, or proof-helper obligations.",
  "run-block-coupled":
    "Semantic facts share a file with run tests or asserts that a generator must split or ignore before code generation.",
  "selected-identity-coupled":
    "The QNT owner proves a selected authored Unit or catalog identity rather than reusable reducer semantics.",
  "unsupported-construct":
    "The semantic core uses a QNT construct not yet admitted by this vocabulary.",
};

const generatorSubsetConstructs = new Set(
  Object.keys(generatorSubsetVocabulary),
);

const generatorReadinessBlockers = new Set(
  Object.keys(generatorReadinessBlockerVocabulary),
);

const generatorReadinessScannerBlockers = {
  semanticCoreRunBlock: "run-block-coupled",
};

function generatorReadinessBlockerCatalogIssues({
  blockerVocabulary = generatorReadinessBlockerVocabulary,
  scannerBlockers = generatorReadinessScannerBlockers,
} = {}) {
  const issues = [];
  const blockerTokens = new Set(Object.keys(blockerVocabulary));
  for (const [token, description] of Object.entries(blockerVocabulary)) {
    if (typeof description !== "string" || description.trim().length === 0) {
      issues.push(
        `generator-readiness blocker ${token} must have a non-empty catalog description.`,
      );
    }
  }
  for (const [scannerName, token] of Object.entries(scannerBlockers)) {
    if (!blockerTokens.has(token)) {
      issues.push(
        `generator-readiness scanner blocker ${scannerName} uses undocumented blocker token ${token}.`,
      );
    }
  }
  return issues;
}

const qntOwnerRoles = new Set([
  "semantic-core",
  "proof-only",
  "mbt-fixture",
  "bridge",
  "selected-identity-trace",
  "legacy-reference",
]);

const kernelIrBoundaryKinds = new Set([
  "command",
  "fill",
  "result",
  "state",
  "active-effect",
  "support-profile",
  "resource",
  "handoff",
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
    battleHoleFrontier: path.join(coverageDir, "battle-hole-frontier.jsonl"),
    profileObligations: path.join(coverageDir, "profile-obligations.jsonl"),
    qntOwnerRoles: path.join(coverageDir, "qnt-owner-roles.jsonl"),
    generatorReadiness: path.join(coverageDir, "generator-readiness.jsonl"),
    kernelIrBoundaries: path.join(coverageDir, "kernel-ir-boundaries.jsonl"),
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
  battleFrontierClassifications,
  battleFrontierSubjects,
  coveragePaths,
  coveredStatuses,
  generatorReadinessBlockerCatalogIssues,
  generatorReadinessBlockers,
  generatorReadinessScannerBlockers,
  generatorReadinessStatuses,
  generatorSubsetConstructs,
  kernelIrBoundaryKinds,
  markerKinds,
  nonSemanticStatuses,
  obligationKinds,
  obligationStatuses,
  parityWitnessKinds,
  qntOwnerRoles,
  runtimes,
  skippedScanDirs,
};
