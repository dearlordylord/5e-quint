#!/usr/bin/env node

const {
  coveragePaths,
  deterministicAdmissionProjectionEvidenceTag,
  executableProfileKinds,
  isUnitFeatureProfileId,
  selectedIdentityMbtEvidenceTag,
} = require("./unit-profile-coverage-config.cjs");
const {
  discoverAuthoredSurfaceUnits,
  discoverInventory,
} = require("./unit-profile-coverage-discovery.cjs");
const {
  readJson,
  readJsonl,
  writeOrCompare,
} = require("./unit-profile-coverage-io.cjs");
const {
  buildMatrix,
  renderReport,
} = require("./unit-profile-coverage-report.cjs");
const {
  buildLevel1FullSupport,
  buildLevel12FullSupport,
  buildLevel13FullSupport,
  buildLevel14FullSupport,
  renderLevel1FullSupport,
  renderLevel12FullSupport,
  renderLevel13FullSupport,
  renderLevel14FullSupport,
} = require("./level1-full-support-report.cjs");
const {
  buildSrdUnitInventory,
  renderSrdUnitInventory,
  validateSrdUnitInventory,
} = require("./srd-unit-inventory.cjs");
const {
  buildUltraGoldenGate,
  renderLevel12UltraGoldenSummary,
  renderUltraGoldenGate,
  validateMcpScenarioEvidence,
} = require("./ultra-golden-gate.cjs");
const {
  buildLevel12QntMbtJoin,
  renderLevel12QntMbtJoin,
} = require("./level12-qnt-mbt-join-report.cjs");
const {
  buildSpellProcedureMbtEvidenceGate,
  renderSpellProcedureMbtEvidenceGate,
} = require("./spell-procedure-mbt-evidence-gate.cjs");
const {
  buildFeatureProcedureMbtEvidenceGate,
  renderFeatureProcedureMbtEvidenceGate,
} = require("./feature-procedure-mbt-evidence-gate.cjs");
const { scanClaimFiles } = require("./unit-profile-coverage-claim-scan.cjs");
const { runSelfTest } = require("./unit-profile-coverage-self-test.cjs");
const {
  validateCoverageInputs,
} = require("./unit-profile-coverage-validation.cjs");
const { buildKernelCoverage } = require("./rules-kernel-coverage-check.cjs");

const root = process.env.UNIT_PROFILE_COVERAGE_ROOT ?? process.cwd();
const write = process.argv.includes("--write");
const selfTest = process.argv.includes("--self-test");
const selectedIdentityHardGate = process.argv.includes(
  "--selected-identity-hard-gate",
);
const paths = coveragePaths(root);

function validateSupportedUnitFeatureRulesKernelJoins(
  rulesKernelSupportedUnitJoin,
) {
  return rulesKernelSupportedUnitJoin.units.flatMap((unit) =>
    unit.profiles
      .filter(
        (profile) =>
          isUnitFeatureProfileId(profile.profileId) &&
          profile.joinStatus !== "covered",
      )
      .map(
        (profile) =>
          `supported Unit ${unit.unitId} unit-feature profile ${profile.profileId} has rules-kernel join status ${profile.joinStatus}.`,
      ),
  );
}

function uniqueSorted(values) {
  return Array.from(new Set(values)).sort();
}

function sameStrings(left, right) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function describeOwnerDelta(actual, expected) {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  const missing = expected.filter((ownerPath) => !actualSet.has(ownerPath));
  const stale = actual.filter((ownerPath) => !expectedSet.has(ownerPath));
  return [
    missing.length > 0 ? `missing ${missing.join(", ")}` : undefined,
    stale.length > 0 ? `stale ${stale.join(", ")}` : undefined,
  ]
    .filter(Boolean)
    .join("; ");
}

function validateUnitFeatureProfileScopedOwnerEvidence({
  featureProcedureMbtEvidenceGate,
  level12QntMbtJoin,
  profiles,
}) {
  const issues = [];
  const profileOwnersById = new Map(
    profiles
      .filter((profile) => isUnitFeatureProfileId(profile.id))
      .map((profile) => [profile.id, uniqueSorted(profile.qntOwners ?? [])]),
  );
  const validateRow = (row, context) => {
    if (
      !isUnitFeatureProfileId(row.profileId) ||
      row.tag !== "obligation-evidence"
    ) {
      return;
    }
    const expected = profileOwnersById.get(row.profileId);
    if (expected === undefined) return;
    const actual = uniqueSorted(
      (row.qntOwners ?? []).map((owner) => owner.ownerPath),
    );
    if (sameStrings(actual, expected)) return;
    const delta = describeOwnerDelta(actual, expected);
    issues.push(
      `${context} for ${row.profileId} emits non-profile-scoped QNT owner evidence (${delta}).`,
    );
  };
  for (const scope of featureProcedureMbtEvidenceGate.scopes ?? []) {
    for (const [index, row] of (scope.rows ?? []).entries()) {
      validateRow(
        row,
        `feature-procedure evidence gate ${scope.scopeId} row ${index + 1}`,
      );
    }
  }
  for (const [index, row] of (level12QntMbtJoin.rows ?? []).entries()) {
    validateRow(row, `level1-2 qnt-mbt join row ${index + 1}`);
  }
  return issues;
}

function main() {
  const collections = readJson(paths.collections);
  const profiles = readJsonl(root, paths.profiles);
  const unitClaims = readJsonl(root, paths.unitClaims);
  const unitEvidence = readJsonl(root, paths.unitEvidence);
  const taskClaims = readJsonl(root, paths.taskClaims);
  const rulesKernelObligations = readJsonl(root, paths.rulesKernelObligations);
  const rulesKernelProfileObligations = readJsonl(
    root,
    paths.rulesKernelProfileObligations,
  );
  const characterCreationOwnerEvidence = readJson(
    paths.characterCreationOwnerEvidence,
  );
  const characterSheetOwnerEvidence = readJson(
    paths.characterSheetOwnerEvidence,
  );
  const sharedAlgebraOwnerEvidence = readJson(paths.sharedAlgebraOwnerEvidence);
  const mcpScenarioEvidence = readJson(paths.mcpScenarioEvidence);
  const inventory = discoverInventory(root, collections.collections);
  const authoredSurfaceUnits = discoverAuthoredSurfaceUnits(root);
  const srdUnitInventory = buildSrdUnitInventory({
    root,
    inventory,
    unitClaims,
    unitEvidence,
    characterCreationOwnerEvidence,
    characterSheetOwnerEvidence,
    sharedAlgebraOwnerEvidence,
  });
  const scannedClaims = scanClaimFiles(root);
  const issues = validateCoverageInputs(
    {
      root,
      collections,
      inventory,
      authoredSurfaceUnits,
      profiles,
      unitClaims,
      unitEvidence,
      taskClaims,
      scannedClaims,
    },
    { selectedIdentityHardGate },
  );
  const rulesKernelCoverage = buildKernelCoverage({ root });
  issues.push(
    ...rulesKernelCoverage.issues.map((issue) => `rules-kernel: ${issue}`),
  );
  issues.push(...validateSrdUnitInventory(srdUnitInventory));
  issues.push(...validateMcpScenarioEvidence(mcpScenarioEvidence, { root }));
  if (issues.length > 0) {
    for (const issue of issues)
      console.error(`unit-profile-coverage: ${issue}`);
    process.exitCode = 1;
    return;
  }

  const matrix = buildMatrix(
    {
      collections,
      inventory,
      authoredSurfaceUnits,
      profiles,
      unitClaims,
      unitEvidence,
      taskClaims,
      rulesKernelObligations,
      rulesKernelProfileObligations,
    },
    {
      executableProfileKinds,
      deterministicAdmissionProjectionEvidenceTag,
      selectedIdentityMbtEvidenceTag,
    },
  );
  const level1FullSupport = buildLevel1FullSupport(matrix, srdUnitInventory, {
    root,
  });
  const level12FullSupport = buildLevel12FullSupport(matrix, srdUnitInventory, {
    root,
  });
  const level13FullSupport = buildLevel13FullSupport(matrix, srdUnitInventory, {
    root,
  });
  const level14FullSupport = buildLevel14FullSupport(matrix, srdUnitInventory, {
    root,
  });
  const ultraGoldenGate = buildUltraGoldenGate({
    level1FullSupport,
    level12FullSupport,
    level13FullSupport,
    level14FullSupport,
    mcpScenarioEvidence,
    rulesKernelMatrix: rulesKernelCoverage.matrix,
    selectedIdentityMbtEvidenceTag,
    unitMatrix: matrix,
  });
  const level12QntMbtJoin = buildLevel12QntMbtJoin({
    level12FullSupport,
    rulesKernelMatrix: rulesKernelCoverage.matrix,
  });
  const spellProcedureMbtEvidenceGate = buildSpellProcedureMbtEvidenceGate({
    level1FullSupport,
    level12FullSupport,
    rulesKernelMatrix: rulesKernelCoverage.matrix,
  });
  const featureProcedureMbtEvidenceGate = buildFeatureProcedureMbtEvidenceGate({
    level1FullSupport,
    level12FullSupport,
    rulesKernelMatrix: rulesKernelCoverage.matrix,
  });
  const postBuildIssues =
    validateSupportedUnitFeatureRulesKernelJoins(
      matrix.rulesKernelProfileJoin.supportedUnitJoin,
    ).concat(
      validateUnitFeatureProfileScopedOwnerEvidence({
        featureProcedureMbtEvidenceGate,
        level12QntMbtJoin,
        profiles,
      }),
    );
  if (postBuildIssues.length > 0) {
    for (const issue of postBuildIssues)
      console.error(`unit-profile-coverage: ${issue}`);
    process.exitCode = 1;
    return;
  }
  writeOrCompare(
    { root, write },
    paths.matrix,
    `${JSON.stringify(matrix, null, 2)}\n`,
  );
  writeOrCompare(
    { root, write },
    paths.report,
    renderReport(matrix, {
      executableProfileKinds,
      deterministicAdmissionProjectionEvidenceTag,
      selectedIdentityMbtEvidenceTag,
    }),
  );
  writeOrCompare(
    { root, write },
    paths.srdUnitInventory,
    `${JSON.stringify(srdUnitInventory, null, 2)}\n`,
  );
  writeOrCompare(
    { root, write },
    paths.srdUnitInventoryReport,
    renderSrdUnitInventory(srdUnitInventory),
  );
  writeOrCompare(
    { root, write },
    paths.level1FullSupport,
    `${JSON.stringify(level1FullSupport, null, 2)}\n`,
  );
  writeOrCompare(
    { root, write },
    paths.level1FullSupportReport,
    renderLevel1FullSupport(level1FullSupport),
  );
  writeOrCompare(
    { root, write },
    paths.level12FullSupport,
    `${JSON.stringify(level12FullSupport, null, 2)}\n`,
  );
  writeOrCompare(
    { root, write },
    paths.level12FullSupportReport,
    renderLevel12FullSupport(level12FullSupport),
  );
  writeOrCompare(
    { root, write },
    paths.level12QntMbtJoin,
    `${JSON.stringify(level12QntMbtJoin, null, 2)}\n`,
  );
  writeOrCompare(
    { root, write },
    paths.level12QntMbtJoinReport,
    renderLevel12QntMbtJoin(level12QntMbtJoin),
  );
  writeOrCompare(
    { root, write },
    paths.level12UltraGoldenSummaryReport,
    renderLevel12UltraGoldenSummary({
      level12FullSupport,
      level12QntMbtJoin,
      ultraGoldenGate,
    }),
  );
  writeOrCompare(
    { root, write },
    paths.spellProcedureMbtEvidenceGate,
    `${JSON.stringify(spellProcedureMbtEvidenceGate, null, 2)}\n`,
  );
  writeOrCompare(
    { root, write },
    paths.spellProcedureMbtEvidenceGateReport,
    renderSpellProcedureMbtEvidenceGate(spellProcedureMbtEvidenceGate),
  );
  writeOrCompare(
    { root, write },
    paths.featureProcedureMbtEvidenceGate,
    `${JSON.stringify(featureProcedureMbtEvidenceGate, null, 2)}\n`,
  );
  writeOrCompare(
    { root, write },
    paths.featureProcedureMbtEvidenceGateReport,
    renderFeatureProcedureMbtEvidenceGate(featureProcedureMbtEvidenceGate),
  );
  writeOrCompare(
    { root, write },
    paths.level13FullSupport,
    `${JSON.stringify(level13FullSupport, null, 2)}\n`,
  );
  writeOrCompare(
    { root, write },
    paths.level13FullSupportReport,
    renderLevel13FullSupport(level13FullSupport),
  );
  writeOrCompare(
    { root, write },
    paths.level14FullSupport,
    `${JSON.stringify(level14FullSupport, null, 2)}\n`,
  );
  writeOrCompare(
    { root, write },
    paths.level14FullSupportReport,
    renderLevel14FullSupport(level14FullSupport),
  );
  writeOrCompare(
    { root, write },
    paths.ultraGoldenGate,
    `${JSON.stringify(ultraGoldenGate, null, 2)}\n`,
  );
  writeOrCompare(
    { root, write },
    paths.ultraGoldenGateReport,
    renderUltraGoldenGate(ultraGoldenGate),
  );
  console.log(
    `Unit profile coverage OK: ${inventory.length} Units, ${profiles.length} profiles.`,
  );
}

if (selfTest) runSelfTest(root);
else main();
