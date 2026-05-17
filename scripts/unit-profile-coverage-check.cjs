#!/usr/bin/env node

const {
  coveragePaths,
  deterministicAdmissionProjectionEvidenceTag,
  executableProfileKinds,
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
  renderLevel1FullSupport,
  renderLevel12FullSupport,
} = require("./level1-full-support-report.cjs");
const {
  buildSrdUnitInventory,
  renderSrdUnitInventory,
  validateSrdUnitInventory,
} = require("./srd-unit-inventory.cjs");
const { scanClaimFiles } = require("./unit-profile-coverage-claim-scan.cjs");
const { runSelfTest } = require("./unit-profile-coverage-self-test.cjs");
const {
  validateCoverageInputs,
} = require("./unit-profile-coverage-validation.cjs");

const root = process.env.UNIT_PROFILE_COVERAGE_ROOT ?? process.cwd();
const write = process.argv.includes("--write");
const selfTest = process.argv.includes("--self-test");
const paths = coveragePaths(root);

function main() {
  const collections = readJson(paths.collections);
  const profiles = readJsonl(root, paths.profiles);
  const unitClaims = readJsonl(root, paths.unitClaims);
  const unitEvidence = readJsonl(root, paths.unitEvidence);
  const taskClaims = readJsonl(root, paths.taskClaims);
  const characterCreationOwnerEvidence = readJson(
    paths.characterCreationOwnerEvidence,
  );
  const characterSheetOwnerEvidence = readJson(
    paths.characterSheetOwnerEvidence,
  );
  const sharedAlgebraOwnerEvidence = readJson(paths.sharedAlgebraOwnerEvidence);
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
  const issues = validateCoverageInputs({
    root,
    collections,
    inventory,
    authoredSurfaceUnits,
    profiles,
    unitClaims,
    unitEvidence,
    taskClaims,
    scannedClaims,
  });
  issues.push(...validateSrdUnitInventory(srdUnitInventory));
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
  console.log(
    `Unit profile coverage OK: ${inventory.length} Units, ${profiles.length} profiles.`,
  );
}

if (selfTest) runSelfTest(root);
else main();
