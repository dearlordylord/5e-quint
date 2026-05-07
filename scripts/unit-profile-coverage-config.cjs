const path = require("node:path");

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
  "passive",
  "action",
  "bonus-action",
  "reaction",
  "spell-invocation",
  "persistent-effect",
  "summoned-companion",
  "stat-block-control",
  "resource",
  "equipment",
  "table-caller",
]);
const claimTags = new Set([
  "supported-profile",
  "unsupported-profile",
  "needs-surface-widening",
  "needs-assumption",
  "closed-by-assumption",
]);
const deterministicAdmissionProjectionEvidenceTag =
  "deterministic-admission-projection";
const selectedIdentityMbtEvidenceTag = "selected-identity-mbt";
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
  "rage",
  "sneak attack",
  "uncanny dodge",
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
    matrix: path.join(coverageDir, "unit-matrix.json"),
    report: path.join(coverageDir, "UNIT_REPORT.md"),
  };
}

module.exports = {
  catalogAdmissionDispositionCategories,
  catalogAdmissionDispositionCategory,
  claimTags,
  collectionIds,
  completedRuntimeParityKinds,
  coveragePaths,
  deterministicAdmissionProjectionEvidenceTag,
  executableProfileKinds,
  fungiTerms,
  nearCanonicalDenyList,
  profileKinds,
  protectedExpressionFields,
  selectedIdentityMbtEvidenceTag,
  skippedClaimScanDirs,
  surfaceUnitKinds,
  unitEvidenceTags,
  unitProfileOwnerClaimKinds,
};
