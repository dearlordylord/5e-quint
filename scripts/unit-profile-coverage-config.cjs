const path = require("node:path");
const {
  mcpScenarioWitnessKind,
  ultraGoldenWitnessKinds,
  witnessKindDescriptions,
} = require("./evidence-witness-kind-config.cjs");

const collectionIds = new Set(["srd-5.2.1", "classic-2024-non-srd-mechanics"]);
const catalogAdmissionDispositionCategory = {
  intentionalBacklog: "intentional-backlog",
  srdCandidate: "srd-candidate",
  classicPrivatePressure: "classic-private-pressure",
  nonRuntimeAuthoredData: "non-runtime-authored-data",
  duplicateContentIssue: "duplicate-content-issue",
  unsupportedWideningPressure: "unsupported-widening-pressure",
};
const catalogAdmissionDispositionCategories = new Set(
  Object.values(catalogAdmissionDispositionCategory),
);
const profileKinds = new Set([
  "character-creation",
  "character-sheet",
  "passive",
  "action",
  "bonus-action",
  "reaction",
  "spell-invocation",
  "battle-admission",
  "persistent-effect",
  "summoned-companion",
  "stat-block-control",
  "resource",
  "equipment",
  "table-caller",
]);
const unitFeatureProfileIdPrefix = "unit-feature.";
function isUnitFeatureProfileId(profileId) {
  return (
    typeof profileId === "string" &&
    profileId.startsWith(unitFeatureProfileIdPrefix)
  );
}
const rulesKernelProfileKindClasses = new Set([
  "rules-kernel",
  "surface-authored-data",
]);
const rulesKernelProfileKindClassifications = Object.freeze({
  "character-creation": "rules-kernel",
  "character-sheet": "rules-kernel",
  passive: "rules-kernel",
  action: "rules-kernel",
  "bonus-action": "rules-kernel",
  reaction: "rules-kernel",
  "spell-invocation": "rules-kernel",
  "battle-admission": "surface-authored-data",
  "persistent-effect": "rules-kernel",
  "summoned-companion": "rules-kernel",
  "stat-block-control": "rules-kernel",
  resource: "rules-kernel",
  equipment: "surface-authored-data",
  "table-caller": "rules-kernel",
});
const rulesKernelProfileKindClassificationReasons = Object.freeze({
  "character-creation":
    "character creation reducers own choice legality, fill validation, advancement, and finalization semantics",
  "character-sheet":
    "character sheet reducers own durable/session sheet projections and mutations",
  passive: "passive profiles project reducer-visible table facts",
  action: "action profiles execute reducer-owned procedures",
  "bonus-action": "bonus-action profiles execute reducer-owned procedures",
  reaction: "reaction profiles execute reducer-owned continuations",
  "spell-invocation":
    "spell invocation profiles execute reducer-owned procedures",
  "battle-admission":
    "battle admission profiles parse authored Surface mechanics into typed support facts without owning reducer procedure semantics",
  "persistent-effect":
    "persistent-effect profiles own active-effect lifecycle and table-state projection",
  "summoned-companion":
    "summoned-companion profiles own reducer-visible companion control semantics",
  "stat-block-control":
    "stat-block-control profiles own reducer-visible creature procedure semantics",
  resource: "resource profiles own reducer-visible spend/recover semantics",
  equipment:
    "equipment profile rows are authored data until admitted through a character-sheet or battle reducer profile",
  "table-caller":
    "table-caller profiles request table facts that feed reducer-owned semantic choices",
});
const rulesKernelProfileKinds = new Set(
  Object.entries(rulesKernelProfileKindClassifications)
    .filter(([, classification]) => classification === "rules-kernel")
    .map(([profileKind]) => profileKind),
);
function rulesKernelProfileKindClassificationIssues() {
  const issues = [];
  for (const profileKind of profileKinds) {
    if (
      !Object.prototype.hasOwnProperty.call(
        rulesKernelProfileKindClassifications,
        profileKind,
      )
    ) {
      issues.push(
        `Profile kind ${profileKind} has no rules-kernel classification.`,
      );
    }
  }
  for (const [profileKind, classification] of Object.entries(
    rulesKernelProfileKindClassifications,
  )) {
    if (!profileKinds.has(profileKind)) {
      issues.push(
        `Rules-kernel profile classification references unknown profile kind ${profileKind}.`,
      );
    }
    if (!rulesKernelProfileKindClasses.has(classification)) {
      issues.push(
        `Profile kind ${profileKind} has unknown rules-kernel classification ${classification}.`,
      );
    }
    const reason = rulesKernelProfileKindClassificationReasons[profileKind];
    if (typeof reason !== "string" || reason.length === 0) {
      issues.push(
        `Profile kind ${profileKind} must declare a rules-kernel classification reason.`,
      );
    }
  }
  return issues;
}
const claimTags = new Set([
  "supported-profile",
  "profile-subset-supported",
  "unsupported-profile",
  "needs-surface-widening",
  "needs-assumption",
  "closed-by-assumption",
]);
const battleReadinessClosureKind = Object.freeze({
  selectionGrantContainer: "selection-grant-container",
  laterLevelOnly: "later-level-only",
  tableSpatialDerivation: "table-spatial-derivation",
  socialKnowledgeEffect: "social-knowledge-effect",
  tablePerceptionExploration: "table-perception-exploration",
  companionControlBoundary: "companion-control-boundary",
  profileSubsetRemainingMechanicsClosed:
    "profile-subset-remaining-mechanics-closed",
  outsideRuntimePresentationExploration:
    "outside-runtime-presentation-exploration",
  outsideBattleRuntime: "outside-battle-runtime",
  resourceOptionRiderBoundary: "resource-option-rider-boundary",
  characterFactRuntimeDetachedSplit:
    "character-fact-and-runtime-detached-split",
});
const battleReadinessClosureKinds = new Set(
  Object.values(battleReadinessClosureKind),
);
const deterministicAdmissionProjectionEvidenceTag =
  "deterministic-admission-projection";
const selectedIdentityMbtEvidenceTag = "selected-identity-mbt";
const selectedIdentityNonApplicableDispositionTag = "not-applicable";
const unitEvidenceTags = new Set([
  deterministicAdmissionProjectionEvidenceTag,
  selectedIdentityMbtEvidenceTag,
]);
const unitProfileOwnerClaimKinds = new Set([
  "qnt-owner",
  "runtime-owner",
  "verification-owner:qnt-proof",
  "verification-owner:focused-mbt",
  "verification-owner:runtime-test",
]);
const executableProfileKinds = new Set([
  "passive",
  "action",
  "bonus-action",
  "reaction",
  "spell-invocation",
  "persistent-effect",
  "summoned-companion",
  "stat-block-control",
  "resource",
]);
const completedRuntimeParityKinds = new Set([
  "completed-runtime-parity",
  "runtime-parity",
]);
const skippedClaimScanDirs = new Set([
  ".git",
  ".ralph",
  ".turbo",
  ".worktrees",
  "coverage",
  "dist",
  "node_modules",
  "test-results",
]);
const fungiTerms = [
  "agaric",
  "bolete",
  "chanterelle",
  "fungi",
  "fungus",
  "hypha",
  "morel",
  "mushroom",
  "mycelium",
  "porcini",
  "spore",
  "truffle",
];
const protectedExpressionFields = new Set([
  "name",
  "description",
  "flavorText",
  "rulesText",
  "examples",
  "lore",
  "artwork",
  "canonicalName",
  "canonicalSource",
]);
const nearCanonicalDenyList = [
  "action surge",
  "cunning action",
  "players handbook",
  "player's handbook",
  "phb",
  "rage",
  "sneak attack",
  "uncanny dodge",
  "xphb",
  "shield",
  "magic missile",
  "fireball",
];
const surfaceUnitKinds = new Set([
  "armor",
  "armor_template",
  "background",
  "class",
  "class_feature",
  "feat",
  "magic_item",
  "mastery",
  "shield",
  "shield_template",
  "species",
  "species_trait",
  "subclass",
  "weapon",
  "weapon_template",
  "spell",
]);

function coveragePaths(root) {
  const coverageDir = path.join(root, "plans/unit-profile-coverage");
  return {
    collections: path.join(coverageDir, "collections.json"),
    profiles: path.join(coverageDir, "profiles.jsonl"),
    unitClaims: path.join(coverageDir, "unit-claims.jsonl"),
    unitEvidence: path.join(coverageDir, "unit-evidence.jsonl"),
    taskClaims: path.join(coverageDir, "task-claims.jsonl"),
    characterCreationOwnerEvidence: path.join(
      coverageDir,
      "character-creation-owner-evidence.json",
    ),
    characterSheetOwnerEvidence: path.join(
      coverageDir,
      "character-sheet-owner-evidence.json",
    ),
    sharedAlgebraOwnerEvidence: path.join(
      coverageDir,
      "shared-algebra-owner-evidence.json",
    ),
    matrix: path.join(coverageDir, "unit-matrix.json"),
    report: path.join(coverageDir, "UNIT_REPORT.md"),
    srdUnitInventory: path.join(coverageDir, "srd-unit-inventory.json"),
    srdUnitInventoryReport: path.join(coverageDir, "SRD_UNIT_INVENTORY.md"),
    level1FullSupport: path.join(coverageDir, "level1-full-support.json"),
    level1FullSupportReport: path.join(coverageDir, "LEVEL1_FULL_SUPPORT.md"),
    level12FullSupport: path.join(coverageDir, "level1-2-full-support.json"),
    level12FullSupportReport: path.join(
      coverageDir,
      "LEVEL1_2_FULL_SUPPORT.md",
    ),
    level12QntMbtJoin: path.join(coverageDir, "level1-2-qnt-mbt-join.json"),
    level12QntMbtJoinReport: path.join(coverageDir, "LEVEL1_2_QNT_MBT_JOIN.md"),
    level12UltraGoldenSummaryReport: path.join(
      coverageDir,
      "LEVEL1_2_ULTRA_GOLDEN_SUMMARY.md",
    ),
    spellProcedureMbtEvidenceGate: path.join(
      coverageDir,
      "spell-procedure-mbt-evidence-gate.json",
    ),
    spellProcedureMbtEvidenceGateReport: path.join(
      coverageDir,
      "SPELL_PROCEDURE_MBT_EVIDENCE_GATE.md",
    ),
    featureProcedureMbtEvidenceGate: path.join(
      coverageDir,
      "feature-procedure-mbt-evidence-gate.json",
    ),
    featureProcedureMbtEvidenceGateReport: path.join(
      coverageDir,
      "FEATURE_PROCEDURE_MBT_EVIDENCE_GATE.md",
    ),
    mcpScenarioEvidence: path.join(coverageDir, "mcp-scenario-evidence.json"),
    level13FullSupport: path.join(coverageDir, "level1-3-full-support.json"),
    level13FullSupportReport: path.join(
      coverageDir,
      "LEVEL1_3_FULL_SUPPORT.md",
    ),
    level14FullSupport: path.join(coverageDir, "level1-4-full-support.json"),
    level14FullSupportReport: path.join(
      coverageDir,
      "LEVEL1_4_FULL_SUPPORT.md",
    ),
    level15FullSupport: path.join(coverageDir, "level1-5-full-support.json"),
    level15FullSupportReport: path.join(
      coverageDir,
      "LEVEL1_5_FULL_SUPPORT.md",
    ),
    level16FullSupport: path.join(coverageDir, "level1-6-full-support.json"),
    level16FullSupportReport: path.join(
      coverageDir,
      "LEVEL1_6_FULL_SUPPORT.md",
    ),
    levelOneSevenMiningAudit: path.join(
      coverageDir,
      "level1-7-mining-audit.json",
    ),
    levelOneSevenMiningAuditReport: path.join(
      coverageDir,
      "LEVEL1_7_MINING_AUDIT.md",
    ),
    ultraGoldenGate: path.join(coverageDir, "ultra-golden-gate.json"),
    ultraGoldenGateReport: path.join(coverageDir, "ULTRA_GOLDEN_GATE.md"),
    rulesKernelObligations: path.join(
      root,
      "plans",
      "rules-kernel-coverage",
      "obligations.jsonl",
    ),
    rulesKernelProfileObligations: path.join(
      root,
      "plans",
      "rules-kernel-coverage",
      "profile-obligations.jsonl",
    ),
  };
}

module.exports = {
  battleReadinessClosureKind,
  battleReadinessClosureKinds,
  catalogAdmissionDispositionCategories,
  catalogAdmissionDispositionCategory,
  claimTags,
  collectionIds,
  completedRuntimeParityKinds,
  coveragePaths,
  deterministicAdmissionProjectionEvidenceTag,
  executableProfileKinds,
  fungiTerms,
  isUnitFeatureProfileId,
  nearCanonicalDenyList,
  profileKinds,
  protectedExpressionFields,
  rulesKernelProfileKindClassificationIssues,
  rulesKernelProfileKindClassificationReasons,
  rulesKernelProfileKindClassifications,
  rulesKernelProfileKinds,
  mcpScenarioWitnessKind,
  selectedIdentityMbtEvidenceTag,
  selectedIdentityNonApplicableDispositionTag,
  skippedClaimScanDirs,
  surfaceUnitKinds,
  unitFeatureProfileIdPrefix,
  unitEvidenceTags,
  unitProfileOwnerClaimKinds,
  ultraGoldenWitnessKinds,
  witnessKindDescriptions,
};
