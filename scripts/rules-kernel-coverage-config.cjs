const path = require("node:path");
const { parityWitnessKinds } = require("./evidence-witness-kind-config.cjs");

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
  "battle-subject-kind",
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
  forall: "Collection `.forall(...)` universal checks.",
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
  "record-update": "Record `.with(...)` or spread update expressions.",
  set: "`Set[...]` types or values.",
  "set-operators": "Set union or similar set algebra operators.",
  size: "Collection `.size()` cardinality queries.",
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
  "later-task-typecheck-coupled":
    "Semantic facts are split into focused QNT owners, but focused verification still imports a later-task owner with a known typecheck blocker.",
  "unsupported-construct":
    "The semantic core uses a QNT construct not yet admitted by this vocabulary.",
};

const generatorSubsetConstructs = new Set(
  Object.keys(generatorSubsetVocabulary),
);

const generatorSubsetObservedConstructAuditObligationIds = new Set([
  "BATTLE.SPELL.SELF_TRANSFORMATION_MODE",
  "BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION",
  "BATTLE.ATTACK.MINIMAL_RESOLUTION",
  "CREATION.DRAFT.FILL_BATCH_SLICE_REPLAY",
  "CREATION.CHOICE_DISCOVERY_CARDINALITY",
]);

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
]);

const qntRegistryExemptionCategoryDescriptions = {
  "leaf-type-vocabulary":
    "A leaf QNT module that carries shared type/tag vocabulary or constants and is intentionally not an obligation owner.",
  "proof-only-example":
    "A proof, example, invariant, or inductive QNT companion that is not a direct rules-kernel owner row.",
  "retired-test-companion":
    "A retained QNT companion from an older proof/test lane that is not active owner evidence.",
  "witness-protocol-leaf":
    "A leaf QNT module that defines witness protocol vocabulary for MBT drivers without owning reducer semantics.",
};

const qntRegistryExemptionCategories = new Set(
  Object.keys(qntRegistryExemptionCategoryDescriptions),
);

const qntRegistryExemptions = [
  {
    ownerPath:
      "packages/battle-runtime/battle-runtime-feature-bridge-examples.qnt",
    category: "proof-only-example",
    evidence:
      "Run-block examples for the feature bridge; registered rule-core and feature owners carry active coverage.",
  },
  {
    ownerPath:
      "packages/battle-runtime/battle-runtime-mirror-image-constants.qnt",
    category: "leaf-type-vocabulary",
    evidence:
      "Mirror Image constants leaf imported by registered Mirror Image owners.",
  },
  {
    ownerPath: "packages/battle-runtime/battle-runtime-model.qnt",
    category: "leaf-type-vocabulary",
    evidence:
      "Battle runtime type vocabulary aggregate intentionally kept free of behavioral bridge imports.",
  },
  {
    ownerPath:
      "packages/battle-runtime/battle-runtime-route-choice-payloads.qnt",
    category: "leaf-type-vocabulary",
    evidence:
      "Exact reducer-route choice payload vocabulary leaf imported by focused route connector MBT drivers without owning reducer semantics.",
  },
  {
    ownerPath:
      "packages/battle-runtime/battle-runtime-next-attack-roll-mode-route-facts.qnt",
    category: "leaf-type-vocabulary",
    evidence:
      "Generic next-Attack-Roll mode route fact vocabulary leaf imported by the focused route connector without owning reducer semantics.",
  },
  {
    ownerPath:
      "packages/battle-runtime/battle-runtime-opportunity-attack-denial-route-facts.qnt",
    category: "leaf-type-vocabulary",
    evidence:
      "Generic reaction-interdiction route fact vocabulary leaf imported by the focused route connector without owning reducer semantics.",
  },
  {
    ownerPath:
      "packages/battle-runtime/battle-runtime-condition-rider-route-facts.qnt",
    category: "leaf-type-vocabulary",
    evidence:
      "Generic condition-rider route fact vocabulary leaf imported by the focused route connector without owning reducer semantics.",
  },
  {
    ownerPath:
      "packages/battle-runtime/battle-runtime-object-light-rider-route-facts.qnt",
    category: "leaf-type-vocabulary",
    evidence:
      "Generic object/light route fact vocabulary leaf imported by the focused route connector without owning reducer semantics.",
  },
  {
    ownerPath:
      "packages/battle-runtime/battle-runtime-spatial-effect-route-facts.qnt",
    category: "leaf-type-vocabulary",
    evidence:
      "Generic spatial-effect route fact vocabulary leaf imported by the focused route connector without owning reducer semantics.",
  },
  {
    ownerPath:
      "packages/battle-runtime/battle-runtime-mixed-target-outcome-route-facts.qnt",
    category: "leaf-type-vocabulary",
    evidence:
      "Generic mixed-target outcome route fact vocabulary leaf imported by the focused route connector without owning reducer semantics.",
  },
  {
    ownerPath: "packages/battle-runtime/battle-runtime-magic-missile-facts.qnt",
    category: "proof-only-example",
    evidence:
      "Literal Magic Missile fixture facts shared by the focused witness and the reducer-route connector; the active route contract is owned by battle-runtime-magic-missile.route.mbt.qnt.",
  },
  {
    ownerPath:
      "packages/battle-runtime/battle-runtime-movement-bridge-examples.qnt",
    category: "proof-only-example",
    evidence:
      "Run-block examples for the movement bridge; registered movement owners carry active coverage.",
  },
  {
    ownerPath:
      "packages/character-battle-runtime/character-battle-reducer-route.qnt",
    category: "leaf-type-vocabulary",
    evidence:
      "Character-battle handoff reducer-route vocabulary leaf for future route connectors; executable handoff route coverage will be registered by connector owners.",
  },
  {
    ownerPath:
      "packages/character-creation-runtime/character-creation-reducer-route.qnt",
    category: "leaf-type-vocabulary",
    evidence:
      "Character-creation reducer-route vocabulary leaf for future route connectors; executable creation route coverage will be registered by connector owners.",
  },
  {
    ownerPath:
      "packages/character-creation-runtime/character-creation-route-fixtures.qnt",
    category: "witness-protocol-leaf",
    evidence:
      "Character-creation reducer-route fixture leaf shared by route connector MBT drivers; semantic creation owners remain the focused QNT slices.",
  },
  {
    ownerPath:
      "packages/character-sheet-runtime/character-sheet-reducer-route.qnt",
    category: "leaf-type-vocabulary",
    evidence:
      "Character-sheet reducer-route vocabulary leaf for future route connectors; executable sheet route coverage will be registered by connector owners.",
  },
  {
    ownerPath:
      "packages/battle-runtime/battle-runtime-public-trace-contract.qnt",
    category: "witness-protocol-leaf",
    evidence: "Public trace protocol vocabulary leaf shared by witnesses.",
  },
  {
    ownerPath: "packages/battle-runtime/battle-runtime-reaction-kinds.qnt",
    category: "leaf-type-vocabulary",
    evidence:
      "Reaction kind vocabulary leaf shared by the model and interrupt bridge.",
  },
  {
    ownerPath:
      "packages/battle-runtime/battle-runtime-see-invisibility-constants.qnt",
    category: "leaf-type-vocabulary",
    evidence: "See Invisibility constants and witness-plane vocabulary leaf.",
  },
  {
    ownerPath:
      "packages/battle-runtime/battle-runtime-sorcerous-burst-damage-choice.qnt",
    category: "leaf-type-vocabulary",
    evidence:
      "Sorcerous Burst damage-choice vocabulary leaf shared by the model and spell bridge.",
  },
  {
    ownerPath:
      "packages/battle-runtime/battle-runtime-spell-bridge-examples.qnt",
    category: "proof-only-example",
    evidence:
      "Run-block examples for the spell bridge; registered spell rule-core and battle owners carry active coverage.",
  },
  {
    ownerPath:
      "packages/battle-runtime/battle-runtime-stat-block-bridge-examples.qnt",
    category: "proof-only-example",
    evidence:
      "Run-block examples for the stat-block bridge; registered stat-block owners carry active coverage.",
  },
  {
    ownerPath: "packages/battle-runtime/rule-core-component-route.qnt",
    category: "leaf-type-vocabulary",
    evidence:
      "Rule-core component route vocabulary leaf shared by component-first MBT drivers; executable component evidence is registered on the rule-core driver witnesses.",
  },
  {
    ownerPath: "packages/battle-runtime/battle-runtime-witness-protocol.qnt",
    category: "witness-protocol-leaf",
    evidence:
      "Typed witness protocol vocabulary leaf for lightweight battle-runtime MBT witnesses.",
  },
  {
    ownerPath:
      "packages/shared-algebras/proofs/action-economy-algebra-inductive.qnt",
    category: "retired-test-companion",
    evidence:
      "Retained shared-algebra inductive proof companion outside the active rules-kernel owner rows.",
  },
  {
    ownerPath:
      "packages/shared-algebras/proofs/conditions-algebra-inductive.qnt",
    category: "retired-test-companion",
    evidence:
      "Retained shared-algebra inductive proof companion outside the active rules-kernel owner rows.",
  },
  {
    ownerPath:
      "packages/shared-algebras/proofs/initiative-algebra-invariant.qnt",
    category: "retired-test-companion",
    evidence:
      "Retained shared-algebra invariant companion outside the active rules-kernel owner rows.",
  },
  {
    ownerPath:
      "packages/shared-algebras/proofs/multiclass-prerequisite-algebra.qnt",
    category: "retired-test-companion",
    evidence:
      "Retained multiclass prerequisite proof companion outside the active rules-kernel owner rows.",
  },
  {
    ownerPath:
      "packages/shared-algebras/proofs/rule-core/action-turn-procedures-inductive.qnt",
    category: "proof-only-example",
    evidence:
      "Inductive proof companion for registered action-turn procedure core owners.",
  },
  {
    ownerPath:
      "packages/shared-algebras/proofs/rule-core/creature-size-order.qnt",
    category: "leaf-type-vocabulary",
    evidence:
      "Shared creature size order leaf imported by registered movement and Unit feature procedure owners.",
  },
  {
    ownerPath:
      "packages/shared-algebras/proofs/rule-core/spell-definition-profiles.qnt",
    category: "leaf-type-vocabulary",
    evidence:
      "Spell definition profile vocabulary imported by registered spell procedure owners.",
  },
  {
    ownerPath:
      "packages/shared-algebras/proofs/rule-core/zero-hit-point-lifecycle-inductive.qnt",
    category: "proof-only-example",
    evidence:
      "Inductive proof companion for registered zero-Hit-Point lifecycle owners.",
  },
];

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
  generatorSubsetObservedConstructAuditObligationIds,
  generatorSubsetConstructs,
  kernelIrBoundaryKinds,
  markerKinds,
  nonSemanticStatuses,
  obligationKinds,
  obligationStatuses,
  parityWitnessKinds,
  qntRegistryExemptionCategories,
  qntRegistryExemptionCategoryDescriptions,
  qntRegistryExemptions,
  qntOwnerRoles,
  runtimes,
  skippedScanDirs,
};
