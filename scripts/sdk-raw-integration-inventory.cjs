#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const { readJson, toRepoPath } = require("./unit-profile-coverage-io.cjs");
const { stable } = require("./unit-profile-coverage-report.cjs");

const root = process.env.SDK_RAW_INTEGRATION_ROOT ?? process.cwd();
const write = process.argv.includes("--write");

const outputDir = path.join(root, "plans/sdk-raw-integration");
const paths = {
  level1: path.join(
    root,
    "plans/unit-profile-coverage/level1-full-support.json",
  ),
  level12: path.join(
    root,
    "plans/unit-profile-coverage/level1-2-full-support.json",
  ),
  level13: path.join(
    root,
    "plans/unit-profile-coverage/level1-3-full-support.json",
  ),
  level14: path.join(
    root,
    "plans/unit-profile-coverage/level1-4-full-support.json",
  ),
  miningAudit: path.join(
    root,
    "plans/unit-profile-coverage/level1-7-mining-audit.json",
  ),
  unitClaims: path.join(root, "plans/unit-profile-coverage/unit-claims.jsonl"),
  unitEvidence: path.join(
    root,
    "plans/unit-profile-coverage/unit-evidence.jsonl",
  ),
  characterCreationOwnerEvidence: path.join(
    root,
    "plans/unit-profile-coverage/character-creation-owner-evidence.json",
  ),
  characterSheetOwnerEvidence: path.join(
    root,
    "plans/unit-profile-coverage/character-sheet-owner-evidence.json",
  ),
  seedScenarioFiles: {
    level1BattleFeatures: path.join(
      root,
      "packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts",
    ),
    level5Tracer: path.join(
      root,
      "packages/character-battle-runtime/src/level5-sdk-tracer-bullets.test.ts",
    ),
  },
  plan: path.join(root, "plans/LEVEL1_5_SDK_RAW_INTEGRATION_TEST_PLAN.md"),
  json: path.join(outputDir, "level1-5-sdk-raw-inventory.json"),
  report: path.join(outputDir, "LEVEL1_5_SDK_RAW_INVENTORY.md"),
};

const levelReportInputs = [
  { key: "level1", title: "Character Level 1", path: paths.level1 },
  { key: "level1-2", title: "Character Levels 1-2", path: paths.level12 },
  { key: "level1-3", title: "Character Levels 1-3", path: paths.level13 },
  { key: "level1-4", title: "Character Levels 1-4", path: paths.level14 },
];

const levelOneFiveBands = new Set([
  "level-1",
  "level-2",
  "level-3",
  "level-4",
  "level-5",
  "spell-level-0",
  "spell-level-1",
  "spell-level-2",
  "spell-level-3",
]);

const buildSheetRowKinds = new Set([
  "class-container",
  "core-trait",
  "multiclass-entry",
  "subclass-selection",
]);
const buildBattleRowKinds = new Set(["equipment-pressure", "mastery-pressure"]);
const sheetSpellAccessRowKinds = new Set([
  "spell-access",
  "subclass-spell-access",
]);
const futureSpellClosureKinds = new Set([
  "outside-battle-runtime",
  "table-spatial-derivation",
  "companion-control-boundary",
]);
const tableOnlySpellClosureKinds = new Set(["social-knowledge-effect"]);
const characterCreationClosureKinds = new Set(["selection-grant-container"]);
const futureFeatureClosureKinds = new Set([
  "character-fact-and-runtime-detached-split",
]);
const ownerProfilePrefixes = [
  ["character-creation.", "character-creation"],
  ["character-sheet.", "character-sheet"],
  ["unit-feature.", "character-battle-to-battle"],
  ["spell.", "character-battle-to-battle"],
];
const ownerPathPrefixes = [
  ["packages/character-creation-runtime/", "character-creation"],
  ["packages/character-sheet-runtime/", "character-sheet"],
  ["packages/character-battle-runtime/", "character-battle-runtime"],
  ["packages/battle-runtime/", "character-battle-to-battle"],
];

const seededSdkScenarioRows = [
  {
    candidateUnitId: "barbarian_rage",
    className: "Barbarian",
    levelBand: "level-1",
    label:
      "level1-sdk-raw-integration: Barbarian Rage projects from a level-1 sheet, spends a use, and applies damage and Resistance riders",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/barbarian:level-1:class-feature-grant:barbarian_rage",
    tracerNeedles: ["barbarianRageUnitId"],
  },
  {
    candidateUnitId: "bard_bardic_inspiration",
    className: "Bard",
    levelBand: "level-1",
    label:
      "level1-sdk-raw-integration: Bardic Inspiration grants a level-1 d6 die, spends a Charisma-derived use, and spends the Bonus Action",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/bard:level-1:class-feature-grant:bard_bardic_inspiration",
    tracerNeedles: ["bardBardicInspirationUnitId"],
  },
  {
    candidateUnitId: "fighter_second_wind",
    className: "Fighter",
    levelBand: "level-1",
    label:
      "level1-sdk-raw-integration: Fighter Second Wind heals through sheet projection and spends one Bonus Action use",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/fighter:level-1:class-feature-grant:fighter_second_wind",
    tracerNeedles: ["fighterSecondWindUnitId"],
  },
  {
    candidateUnitId: "monk_martial_arts",
    className: "Monk",
    levelBand: "level-1",
    label:
      "level1-sdk-raw-integration: Monk Martial Arts projects a level-1 Bonus Action Unarmed Strike using the Martial Arts die and Dexterity",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId: "srd521:classes/monk:level-1:class-feature-grant:monk_martial_arts",
    tracerNeedles: ["monkMartialArtsUnitId"],
  },
  {
    candidateUnitId: "rogue_sneak_attack",
    className: "Rogue",
    levelBand: "level-1",
    label:
      "level1-sdk-raw-integration: Rogue Sneak Attack projects as a level-1 Dagger damage rider and records once-per-turn use",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/rogue:level-1:class-feature-grant:rogue_sneak_attack",
    tracerNeedles: ["rogueSneakAttackUnitId"],
  },
  {
    candidateUnitId: "sorcerer_innate_sorcery",
    className: "Sorcerer",
    levelBand: "level-1",
    label:
      "level1-sdk-raw-integration: Sorcerer Innate Sorcery spends a use for one minute and projects Sorcerer spell bonuses",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/sorcerer:level-1:class-feature-grant:sorcerer_innate_sorcery",
    tracerNeedles: ["sorcererInnateSorceryUnitId", "sorcerousBurstSpellId"],
  },
  {
    candidateUnitId: "burning_hands",
    className: "Sorcerer",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Sorcerer Burning Hands resolves from a level-1 sheet, applies Fire damage, and spends a spell slot",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/sorcerer:spell-level-1:spell-unit-pressure:sorcerer_spell_list_burning_hands",
    tracerNeedles: ["levelOneSorcererBurningHandsBuild", "burningHandsSpellId"],
  },
  {
    candidateUnitId: "burning_hands",
    className: "Wizard",
    levelBand: "spell-level-1",
    label:
      "level1-sdk-raw-integration: Wizard Burning Hands resolves from a level-1 spellbook sheet, applies Fire damage, and spends a spell slot",
    path: paths.seedScenarioFiles.level1BattleFeatures,
    rowId:
      "srd521:classes/wizard:spell-level-1:spell-unit-pressure:wizard_spell_list_burning_hands",
    tracerNeedles: [
      "const wizardBuild = finalizedLevelOneWizardBurningHandsBuild();",
      "build: wizardBuild,",
      'sourceUnitId: "class_wizard"',
      "spellbook:",
      "preparedSpells:",
      "burningHandsSpellId",
    ],
    helperNeedles: [
      {
        anchor:
          "function finalizedLevelOneWizardBurningHandsBuild(): CharacterBuild",
        needles: [
          "const draft = createCharacterDraft({",
          "fillCreationHoles({",
          "const result = finalizeCharacterDraft({ draft: afterPurchase, unitLibrary });",
          "return result.build;",
        ],
      },
    ],
  },
  {
    candidateUnitId: "monk_extra_attack",
    className: "Monk",
    levelBand: "level-5",
    label: "level5-sdk-tracer-bullets: Extra Attack",
    path: paths.seedScenarioFiles.level5Tracer,
    rowId: "srd521:classes/monk:level-5:class-feature-grant:monk_extra_attack",
    tracerNeedles: ["monkExtraAttackUnitId"],
  },
  {
    candidateUnitId: "monk_stunning_strike",
    className: "Monk",
    levelBand: "level-5",
    label: "level5-sdk-tracer-bullets: Stunning Strike",
    path: paths.seedScenarioFiles.level5Tracer,
    rowId:
      "srd521:classes/monk:level-5:class-feature-grant:monk_stunning_strike",
    tracerNeedles: ["monkStunningStrikeUnitId"],
  },
  {
    candidateUnitId: "rogue_cunning_strike",
    className: "Rogue",
    levelBand: "level-5",
    label: "level5-sdk-tracer-bullets: Cunning Strike",
    path: paths.seedScenarioFiles.level5Tracer,
    rowId:
      "srd521:classes/rogue:level-5:class-feature-grant:rogue_cunning_strike",
    tracerNeedles: ["rogueCunningStrikeUnitId"],
  },
  {
    candidateUnitId: "sorcerer_sorcerous_restoration",
    className: "Sorcerer",
    levelBand: "level-5",
    label: "level5-sdk-tracer-bullets: Sorcerous Restoration",
    path: paths.seedScenarioFiles.level5Tracer,
    rowId:
      "srd521:classes/sorcerer:level-5:class-feature-grant:sorcerer_sorcerous_restoration",
    tracerNeedles: ["sorcerousRestoration"],
  },
  {
    candidateUnitId: "haste",
    className: "Wizard",
    levelBand: "spell-level-3",
    label: "level5-sdk-tracer-bullets: Haste",
    path: paths.seedScenarioFiles.level5Tracer,
    rowId:
      "srd521:classes/wizard:spell-level-3:spell-unit-pressure:wizard_spell_list_haste",
    tracerNeedles: ["hasteSpellId"],
  },
  {
    candidateUnitId: "protection_from_energy",
    className: "Wizard",
    levelBand: "spell-level-3",
    label: "level5-sdk-tracer-bullets: Protection from Energy",
    path: paths.seedScenarioFiles.level5Tracer,
    rowId:
      "srd521:classes/wizard:spell-level-3:spell-unit-pressure:wizard_spell_list_protection_from_energy",
    tracerNeedles: ["protectionFromEnergySpellId"],
  },
];
const seededSdkScenarioRecords = seededSdkScenarioRows.map((row) => ({
  rowId: row.rowId,
  rowKey: seedScenarioRowKey(row),
  levelBand: row.levelBand,
  className: row.className,
  candidateUnitId: row.candidateUnitId,
  tracerNeedles: row.tracerNeedles,
  helperNeedles: row.helperNeedles ?? [],
  existingSdkScenario: {
    label: row.label,
    path: toRepoPath(root, row.path),
  },
}));
const seededSdkScenarioByRowId = new Map(
  seededSdkScenarioRecords.map((row) => [row.rowId, row.existingSdkScenario]),
);

function countValues(values) {
  return Object.fromEntries(
    Array.from(
      values.reduce((counts, value) => {
        counts.set(value, (counts.get(value) ?? 0) + 1);
        return counts;
      }, new Map()),
    ).sort(([left], [right]) => String(left).localeCompare(String(right))),
  );
}

function md(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\n/g, "<br>");
}

function uniqueSorted(values) {
  return Array.from(new Set(values)).sort();
}

function readJsonl(filePath) {
  const text = fs.readFileSync(filePath, "utf8").trim();
  if (text === "") return [];
  return text.split("\n").map((line) => JSON.parse(line));
}

function indexUnitClaims(records) {
  const claimsByUnitId = new Map();
  for (const record of records) {
    if (claimsByUnitId.has(record.unitId)) {
      throw new Error(`Duplicate unit claim for ${record.unitId}`);
    }
    claimsByUnitId.set(record.unitId, record.claim);
  }
  return claimsByUnitId;
}

function indexUnitEvidence(records) {
  return records.reduce((evidenceByUnitId, record) => {
    const entries = evidenceByUnitId.get(record.unitId) ?? [];
    entries.push(record.evidence);
    evidenceByUnitId.set(record.unitId, entries);
    return evidenceByUnitId;
  }, new Map());
}

function evidenceRowsByRowId(filePath) {
  return new Map(Object.entries(readJson(filePath).rows ?? {}));
}

function writeSdkRawArtifact(filePath, text) {
  if (write) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, text);
    return;
  }
  const actual = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf8")
    : "";
  if (actual !== text) {
    throw new Error(
      `${toRepoPath(root, filePath)} is stale. Run node scripts/sdk-raw-integration-inventory.cjs --write.`,
    );
  }
}

function duplicateValues(values) {
  const counts = values.reduce((acc, value) => {
    acc.set(value, (acc.get(value) ?? 0) + 1);
    return acc;
  }, new Map());
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort();
}

function sourceRef(source) {
  return `${source.path}:${source.lineStart}`;
}

function supportSnapshotLabel(snapshot, valueKey) {
  return snapshot.state === "recorded" ? snapshot[valueKey] : snapshot.state;
}

function hasSupportedRuntimeProfile(row) {
  const unitProfile = row.supportSnapshot.unitProfile;
  if (unitProfile.state !== "recorded") return false;
  const disposition = unitProfile.disposition;
  return (
    disposition === "supported-profile" ||
    disposition === "profile-subset-supported"
  );
}

function battleReadinessStatusIs(row, status) {
  const battleReadiness = row.supportSnapshot.battleReadiness;
  return (
    battleReadiness.state === "recorded" && battleReadiness.status === status
  );
}

function battleReadinessStateIs(row, state) {
  const battleReadiness = row.supportSnapshot.battleReadiness;
  return battleReadiness.state === state;
}

function profileOwnerBoundary(profileId) {
  const matched = ownerProfilePrefixes.find(([prefix]) =>
    profileId.startsWith(prefix),
  );
  return matched?.[1];
}

function ownerPathBoundary(ownerPath) {
  const matched = ownerPathPrefixes.find(([prefix]) =>
    ownerPath.startsWith(prefix),
  );
  return matched?.[1];
}

function rowEvidenceOwnerBoundaries(row, ownerEvidence) {
  return uniqueSorted([
    ...(ownerEvidence.characterCreationRowsByRowId.has(row.rowId)
      ? ["character-creation"]
      : []),
    ...(ownerEvidence.characterSheetRowsByRowId.has(row.rowId)
      ? ["character-sheet"]
      : []),
  ]);
}

function classFeatureOwnerResult(row, ownerEvidence) {
  const claim = ownerEvidence.unitClaimsByUnitId.get(row.candidateUnitId);
  const profileIds = claim?.profileIds ?? [];
  const profileOwnerBoundaries = uniqueSorted(
    profileIds.map(profileOwnerBoundary).filter(Boolean),
  );
  const unclassifiedProfileIds = profileIds.filter(
    (profileId) => profileOwnerBoundary(profileId) === undefined,
  );
  const unitEvidence =
    ownerEvidence.unitEvidenceByUnitId.get(row.candidateUnitId) ?? [];
  const unitEvidenceOwnerPaths = uniqueSorted(
    unitEvidence.map((evidence) => evidence.ownerPath).filter(Boolean),
  );
  const unitEvidenceOwnerBoundaries = uniqueSorted(
    unitEvidenceOwnerPaths.map(ownerPathBoundary).filter(Boolean),
  );
  const rowEvidenceBoundaries = rowEvidenceOwnerBoundaries(row, ownerEvidence);
  const evidenceOwnerBoundaries = unitEvidenceOwnerBoundaries.filter(
    (boundary) => boundary !== "character-battle-runtime",
  );
  const classificationBoundaries = uniqueSorted(
    profileOwnerBoundaries.length > 0
      ? [...profileOwnerBoundaries, ...evidenceOwnerBoundaries]
      : [...rowEvidenceBoundaries, ...evidenceOwnerBoundaries],
  );
  const proposedOwnerBoundary =
    unclassifiedProfileIds.length > 0 || classificationBoundaries.length === 0
      ? "class-feature-owner-review"
      : classificationBoundaries.length === 1
        ? classificationBoundaries[0]
        : "multi-owner-sdk-split";

  return {
    proposedOwnerBoundary,
    ownerBoundaryEvidence: {
      source: "unit-profile-owner-evidence",
      claimTag: claim?.tag,
      profileIds,
      profileOwnerBoundaries,
      unclassifiedProfileIds,
      rowEvidenceOwnerBoundaries: rowEvidenceBoundaries,
      unitEvidenceOwnerBoundaries,
      unitEvidenceOwnerPaths,
      evidenceTags: uniqueSorted(
        unitEvidence.map((evidence) => evidence.tag).filter(Boolean),
      ),
      ...(claim?.selectedIdentityEvidenceDisposition === undefined
        ? {}
        : {
            selectedIdentityEvidenceDisposition:
              claim.selectedIdentityEvidenceDisposition,
          }),
    },
  };
}

function spellEffectOwnerResult(row) {
  const closure = row.supportSnapshot.battleReadinessClosure;
  if (closure?.state !== "recorded") {
    return {
      proposedOwnerBoundary: "spell-effect-owner-review",
      ownerBoundaryEvidence: {
        source: "battle-readiness-closure",
        closureState: closure?.state ?? "missing",
      },
    };
  }
  if (futureSpellClosureKinds.has(closure.kind)) {
    return {
      proposedOwnerBoundary: "future-runtime-owner-before-sdk",
      ownerBoundaryEvidence: {
        source: "battle-readiness-closure",
        closure,
      },
    };
  }
  if (tableOnlySpellClosureKinds.has(closure.kind)) {
    return {
      proposedOwnerBoundary: "table-only-closure",
      ownerBoundaryEvidence: {
        source: "battle-readiness-closure",
        closure,
      },
    };
  }
  if (closure.kind === "outside-runtime-presentation-exploration") {
    return {
      proposedOwnerBoundary: "spell-effect-owner-review",
      ownerBoundaryEvidence: {
        source: "battle-readiness-closure",
        closure,
      },
    };
  }
  return {
    proposedOwnerBoundary: "spell-effect-owner-review",
    ownerBoundaryEvidence: {
      source: "battle-readiness-closure",
      closure,
    },
  };
}

function unsupportedClassFeatureOwnerResult(row, ownerEvidence) {
  const rowEvidenceBoundaries = rowEvidenceOwnerBoundaries(row, ownerEvidence);
  if (rowEvidenceBoundaries.length > 0) {
    return {
      proposedOwnerBoundary:
        rowEvidenceBoundaries.length === 1
          ? rowEvidenceBoundaries[0]
          : "multi-owner-sdk-split",
      ownerBoundaryEvidence: {
        source: "row-owner-evidence",
        rowEvidenceOwnerBoundaries: rowEvidenceBoundaries,
      },
    };
  }
  const closure = row.supportSnapshot.battleReadinessClosure;
  if (closure?.state !== "recorded") {
    return {
      proposedOwnerBoundary: "class-feature-closure-review",
      ownerBoundaryEvidence: {
        source: "battle-readiness-closure",
        closureState: closure?.state ?? "missing",
      },
    };
  }
  if (characterCreationClosureKinds.has(closure.kind)) {
    return {
      proposedOwnerBoundary: "character-creation",
      ownerBoundaryEvidence: {
        source: "battle-readiness-closure",
        closure,
      },
    };
  }
  if (futureFeatureClosureKinds.has(closure.kind)) {
    return {
      proposedOwnerBoundary: "future-runtime-owner-before-sdk",
      ownerBoundaryEvidence: {
        source: "battle-readiness-closure",
        closure,
      },
    };
  }
  return {
    proposedOwnerBoundary: "class-feature-closure-review",
    ownerBoundaryEvidence: {
      source: "battle-readiness-closure",
      closure,
    },
  };
}

function slug(value) {
  const result = String(value ?? "none")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return result === "" ? "none" : result;
}

function seedScenarioRowKey(row) {
  return `${row.levelBand}:${row.className}:${row.candidateUnitId}`;
}

function seedScenarioTitle(row) {
  return row.label.replace(/^[^:]+:\s*/, "");
}

function levelReportFrontier(report) {
  return report.frontierRows.map((row) => ({
    unitId: row.unitId,
    kind: row.kind,
    status: row.status,
    claimTag: row.claimTag,
    sourceRows: row.sourceRows ?? [],
    reason: row.reason,
  }));
}

function levelReportSummary(input) {
  const report = readJson(input.path);
  return {
    key: input.key,
    title: input.title,
    sourcePath: toRepoPath(root, input.path),
    levelBands: report.scope.levelBands,
    strictTargetClosure: report.metrics.strictTargetClosure,
    strictRuntimeProfileSupport: report.metrics.strictRuntimeProfileSupport,
    productReadiness: report.metrics.productReadiness,
    summary: report.summary,
    frontierRows: levelReportFrontier(report),
  };
}

function ownerBoundaryForMiningRow(row, ownerEvidence) {
  if (row.rowKind === "class-table-summary") return "build-progression";
  if (buildSheetRowKinds.has(row.rowKind)) return "character-build-to-sheet";
  if (buildBattleRowKinds.has(row.rowKind)) return "character-build-to-battle";
  if (sheetSpellAccessRowKinds.has(row.rowKind)) {
    return "character-sheet-spell-access";
  }
  if (row.supportSnapshot.finalDisposition === "non-runtime") {
    return "non-runtime-closure";
  }
  if (
    battleReadinessStatusIs(row, "battle-runtime-required") ||
    row.supportSnapshot.finalDisposition.endsWith("owner-evidence-required") ||
    row.supportSnapshot.finalDisposition ===
      "catalog-authored-executable-follow-up"
  ) {
    return "future-runtime-owner-before-sdk";
  }
  if (row.rowKind === "class-feature-grant") {
    if (hasSupportedRuntimeProfile(row)) {
      if (battleReadinessStatusIs(row, "accepted")) {
        return classFeatureOwnerResult(row, ownerEvidence);
      }
      if (battleReadinessStateIs(row, "not-applicable")) {
        return classFeatureOwnerResult(row, ownerEvidence);
      }
    }
    return unsupportedClassFeatureOwnerResult(row, ownerEvidence);
  }
  if (row.rowKind === "spell-unit-pressure") {
    if (battleReadinessStatusIs(row, "accepted-no-battle-effect")) {
      return spellEffectOwnerResult(row);
    }
    return battleReadinessStatusIs(row, "accepted")
      ? "character-battle-to-battle"
      : "spell-access-or-battle";
  }
  if (battleReadinessStatusIs(row, "accepted")) {
    return "character-battle-to-battle";
  }
  return "character-sheet-or-build-closure";
}

function normalizeOwnerBoundaryResult(result) {
  return typeof result === "string"
    ? { proposedOwnerBoundary: result }
    : result;
}

function ownerBoundaryStatus(boundary, disposition) {
  return boundary.endsWith("-review") || disposition === "closure-review-needed"
    ? "unresolved-review"
    : "resolved";
}

function implementationTaskForLevelBand(levelBand) {
  if (
    levelBand === "level-1" ||
    levelBand === "spell-level-0" ||
    levelBand === "spell-level-1"
  ) {
    return "L15-SDK-RAW-03";
  }
  if (levelBand === "level-2") return "L15-SDK-RAW-04";
  if (levelBand === "level-3" || levelBand === "spell-level-2") {
    return "L15-SDK-RAW-05";
  }
  if (levelBand === "level-4") return "L15-SDK-RAW-06";
  if (levelBand === "level-5" || levelBand === "spell-level-3") {
    return "L15-SDK-RAW-07";
  }
  return "L15-SDK-RAW-01";
}

function scenarioLaneForRow(row) {
  if (row.sdkInventoryDisposition === "seed-scenario-present") {
    return "seed-present";
  }
  if (row.sdkInventoryDisposition === "future-owner-before-sdk") {
    return "future-owner-before-sdk";
  }
  if (row.sdkInventoryDisposition === "explicit-closure-needed") {
    return "explicit-closure";
  }
  if (row.sdkInventoryDisposition === "sdk-scenario-or-owner-closure-needed") {
    return "owner-review";
  }
  if (row.sdkInventoryDisposition === "closure-review-needed") {
    if (row.proposedOwnerBoundary === "spell-effect-owner-review") {
      return "spell-effect-owner-review";
    }
    if (row.proposedOwnerBoundary === "class-feature-closure-review") {
      return "feature-owner-review";
    }
    return "sheet-build-closure";
  }
  if (row.sdkInventoryDisposition === "table-only-closure-needed") {
    return "table-only-closure";
  }
  if (row.proposedOwnerBoundary === "character-build-to-sheet") {
    return "build-sheet-sdk";
  }
  if (row.proposedOwnerBoundary === "character-build-to-battle") {
    return "build-battle-sdk";
  }
  if (row.proposedOwnerBoundary === "character-sheet-spell-access") {
    return "sheet-spell-access-sdk";
  }
  if (
    row.proposedOwnerBoundary === "class-feature-owner-review" ||
    row.proposedOwnerBoundary === "class-feature-closure-review"
  ) {
    return "feature-owner-review";
  }
  if (row.proposedOwnerBoundary === "character-creation") {
    return "character-creation-sdk";
  }
  if (row.proposedOwnerBoundary === "character-sheet") {
    return "character-sheet-sdk";
  }
  if (row.proposedOwnerBoundary === "multi-owner-sdk-split") {
    return "multi-owner-feature-sdk";
  }
  if (
    row.proposedOwnerBoundary === "character-battle-to-battle" &&
    row.rowKind === "spell-unit-pressure"
  ) {
    return "battle-spell-sdk";
  }
  if (row.proposedOwnerBoundary === "character-battle-to-battle") {
    return "battle-feature-sdk";
  }
  return "inventory-review";
}

function scenarioGroupParts(row) {
  const taskId = implementationTaskForLevelBand(row.levelBand);
  const lane = scenarioLaneForRow(row);
  if (lane === "seed-present") {
    return [taskId, lane, seedScenarioRowKey(row)];
  }
  if (
    lane === "battle-spell-sdk" ||
    lane === "spell-effect-owner-review" ||
    lane === "table-only-closure" ||
    lane === "future-owner-before-sdk" ||
    lane === "owner-review"
  ) {
    return [taskId, lane, row.candidateUnitId];
  }
  if (lane === "build-sheet-sdk") {
    return [taskId, lane, row.className];
  }
  if (lane === "build-battle-sdk") {
    return [taskId, lane, row.className];
  }
  if (lane === "sheet-spell-access-sdk") {
    return [taskId, lane, row.className, row.rowKind];
  }
  if (
    lane === "feature-owner-review" ||
    lane === "battle-feature-sdk" ||
    lane === "character-creation-sdk" ||
    lane === "character-sheet-sdk" ||
    lane === "multi-owner-feature-sdk" ||
    lane === "sheet-build-closure"
  ) {
    return [taskId, lane, row.candidateUnitId];
  }
  if (lane === "explicit-closure") {
    return [taskId, lane, row.className, row.rowKind, row.candidateUnitId];
  }
  return [taskId, lane, row.proposedOwnerBoundary, row.candidateUnitId];
}

function scenarioGroupRawKey(row) {
  return JSON.stringify(scenarioGroupParts(row));
}

function scenarioGroupDisplayId(row) {
  return scenarioGroupParts(row).map(slug).join(":");
}

function scenarioSuggestion(group) {
  if (group.lane === "seed-present") {
    return "Keep the existing tracer as the SDK regression and add row-specific assertions only if RAW review finds a gap.";
  }
  if (group.lane === "build-sheet-sdk") {
    return "Finalize the character build/sheet for this class slice and assert RAW-facing class, proficiency, selection, or derived sheet facts at the build/sheet owner.";
  }
  if (group.lane === "build-battle-sdk") {
    return "Finalize build and equipment/mastery choices, project to battle, and assert AC, attack, damage, or mastery facts that a user reaches through the SDK path.";
  }
  if (group.lane === "sheet-spell-access-sdk") {
    return "Create the sheet through class or subclass spell access and assert known/prepared/list/slot facts; leave spell effects to the spell-unit scenario groups.";
  }
  if (group.lane === "feature-owner-review") {
    return "Resolve the feature's real owner boundary from focused evidence before implementation: build/sheet for persistent facts and resources, or character-battle plus battle resolution only when the feature is battle-executable.";
  }
  if (group.lane === "character-creation-sdk") {
    return "Finalize the build through character creation and assert the SRD-facing selected feature, option, proficiency, or retained Unit refs without claiming sheet or battle execution.";
  }
  if (group.lane === "character-sheet-sdk") {
    return "Create the sheet through the build path and assert the SRD-facing resource, rest, recovery, derived stat, or persistent sheet projection at the sheet owner.";
  }
  if (group.lane === "multi-owner-feature-sdk") {
    return "Split the SDK coverage by profile owner: assert build/sheet facts at their owner, then add battle projection/resolution only for the executable profile facts.";
  }
  if (group.lane === "battle-feature-sdk") {
    return "Build or sheet the class at the required level, project to battle, discover/resolve the feature act or trigger, and assert RAW-facing effects and resources.";
  }
  if (group.lane === "battle-spell-sdk") {
    return "Create a level-appropriate caster for each listed access row or pair one spell execution with explicit class-access assertions, cast through battle discovery/resolution, and assert RAW-facing effects and resources.";
  }
  if (group.lane === "spell-effect-owner-review") {
    return "Resolve the missing or unfamiliar spell closure evidence before implementation; do not infer table-only or future-owner status from prose alone.";
  }
  if (group.lane === "table-only-closure") {
    return "Add or retain an explicit SDK-scope closure assertion tied to the local RAW anchor and recorded social/knowledge closure evidence.";
  }
  if (group.lane === "sheet-build-closure") {
    return "Review lower-owner evidence and either add a build/sheet SDK assertion for user-reachable state or retain an explicit closure with the local RAW anchor.";
  }
  if (group.lane === "explicit-closure") {
    return "Keep this generated non-runtime class-table closure tied to the local class table row.";
  }
  if (group.lane === "future-owner-before-sdk") {
    return "Do not write a skipped SDK test; complete or split the owning runtime/spec work first, then add the SDK scenario.";
  }
  if (group.lane === "owner-review") {
    return "Existing owner evidence is present but SDK coverage is not settled; either write the SDK scenario or document why lower-owner evidence is the durable closure.";
  }
  return "Review this group before implementation; the generator could not assign a narrower scenario lane.";
}

function buildScenarioGroups(rows) {
  const groupedRows = rows.reduce((groups, row) => {
    const key = scenarioGroupRawKey(row);
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
    return groups;
  }, new Map());

  return Array.from(groupedRows.entries())
    .map(([, groupRows]) => {
      const first = groupRows[0];
      const levelBands = uniqueSorted(groupRows.map((row) => row.levelBand));
      const classNames = uniqueSorted(
        groupRows.map((row) => row.className).filter(Boolean),
      );
      const candidateUnitIds = uniqueSorted(
        groupRows.map((row) => row.candidateUnitId),
      );
      const lane = scenarioLaneForRow(first);
      const group = {
        groupId: scenarioGroupDisplayId(first),
        rawGroupKey: scenarioGroupRawKey(first),
        taskId: implementationTaskForLevelBand(first.levelBand),
        lane,
        proposedOwnerBoundaries: uniqueSorted(
          groupRows.map((row) => row.proposedOwnerBoundary),
        ),
        ownerBoundaryStatuses: uniqueSorted(
          groupRows.map((row) => row.ownerBoundaryStatus),
        ),
        sdkInventoryDispositions: uniqueSorted(
          groupRows.map((row) => row.sdkInventoryDisposition),
        ),
        levelBands,
        rowKinds: uniqueSorted(groupRows.map((row) => row.rowKind)),
        categories: uniqueSorted(groupRows.map((row) => row.category)),
        classNames,
        candidateUnitIds,
        rowCount: groupRows.length,
        sampleConcepts: uniqueSorted(groupRows.map((row) => row.concept)).slice(
          0,
          8,
        ),
        rawSources: uniqueSorted(groupRows.map((row) => sourceRef(row.source))),
        rows: groupRows.map((row) => ({
          rowId: row.rowId,
          levelBand: row.levelBand,
          className: row.className,
          concept: row.concept,
          candidateUnitId: row.candidateUnitId,
          source: row.source,
          sdkInventoryDisposition: row.sdkInventoryDisposition,
          proposedOwnerBoundary: row.proposedOwnerBoundary,
          ownerBoundaryStatus: row.ownerBoundaryStatus,
        })),
      };
      return {
        ...group,
        suggestedScenario: scenarioSuggestion(group),
      };
    })
    .sort((left, right) => left.groupId.localeCompare(right.groupId));
}

function assertLocalRawSources(rows) {
  const invalidRows = rows.filter(
    (row) =>
      !row.source.path.startsWith(".references/srd-5.2.1/") ||
      !Number.isInteger(row.source.lineStart),
  );
  if (invalidRows.length === 0) return;
  const details = invalidRows
    .slice(0, 10)
    .map((row) => `${row.rowId} -> ${sourceRef(row.source)}`)
    .join("\n");
  throw new Error(
    `SDK RAW inventory requires local SRD 5.2.1 source anchors. Invalid rows: ${invalidRows.length}\n${details}`,
  );
}

function assertSeedScenarios(seedScenarioSources, rows) {
  const rowsById = new Map(rows.map((row) => [row.rowId, row]));
  const errors = seededSdkScenarioRows.flatMap((seed) => {
    const matchedRow = rowsById.get(seed.rowId);
    const seedErrors = [];
    if (matchedRow === undefined) {
      seedErrors.push(`${seed.rowId} is absent from mined rows`);
    } else if (seedScenarioRowKey(matchedRow) !== seedScenarioRowKey(seed)) {
      seedErrors.push(
        `${seed.rowId} no longer matches ${seedScenarioRowKey(seed)}`,
      );
    }
    const seedSourceText = seedScenarioSources.get(seed.path);
    if (seedSourceText === undefined) {
      seedErrors.push(
        `${seed.rowId} seed file ${toRepoPath(root, seed.path)} was not read`,
      );
    }
    const title = seedScenarioTitle(seed);
    if (seedSourceText !== undefined && !seedSourceText.includes(title)) {
      seedErrors.push(
        `${seed.rowId} scenario title "${title}" is absent from ${toRepoPath(root, seed.path)}`,
      );
    }
    const scenarioText =
      seedSourceText === undefined
        ? undefined
        : seedScenarioSourceText(seedSourceText, title);
    for (const needle of seed.tracerNeedles) {
      if (scenarioText === undefined || !scenarioText.includes(needle)) {
        seedErrors.push(
          `${seed.rowId} tracer needle "${needle}" is absent from scenario "${title}"`,
        );
      }
    }
    for (const helper of seed.helperNeedles ?? []) {
      const helperText =
        seedSourceText === undefined
          ? undefined
          : seedHelperSourceText(seedSourceText, helper.anchor);
      if (helperText === undefined) {
        seedErrors.push(
          `${seed.rowId} helper anchor "${helper.anchor}" is absent from ${toRepoPath(root, seed.path)}`,
        );
        continue;
      }
      for (const needle of helper.needles) {
        if (!helperText.includes(needle)) {
          seedErrors.push(
            `${seed.rowId} helper needle "${needle}" is absent from helper "${helper.anchor}"`,
          );
        }
      }
    }
    return seedErrors;
  });
  if (errors.length === 0) return;
  throw new Error(
    `SDK seed scenario declarations are stale:\n${errors.join("\n")}`,
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function seedScenarioSourceText(tracerText, title) {
  const titlePattern = new RegExp(
    `\\btest\\(\\s*["'\`]${escapeRegExp(title)}\\b`,
  );
  const match = titlePattern.exec(tracerText);
  if (match === null) return undefined;
  const rest = tracerText.slice(match.index);
  const endMatch =
    /\n\s+test\(|\n\}\);\n\n(?:type|function|const|class)\b/.exec(
      rest.slice(1),
    );
  return endMatch === null ? rest : rest.slice(0, endMatch.index + 1);
}

function seedHelperSourceText(tracerText, anchor) {
  const anchorIndex = tracerText.indexOf(anchor);
  if (anchorIndex === -1) return undefined;
  const rest = tracerText.slice(anchorIndex);
  const endMatch = /\nfunction\s+\w|\ntype\s+\w|\nconst\s+\w|\nclass\s+\w/.exec(
    rest.slice(1),
  );
  return endMatch === null ? rest : rest.slice(0, endMatch.index + 1);
}

function assertUniqueScenarioGroupIds(groups) {
  const duplicateGroupIds = duplicateValues(
    groups.map((group) => group.groupId),
  );
  if (duplicateGroupIds.length === 0) return;
  throw new Error(
    `SDK scenario group display ids must be unique. Duplicates: ${duplicateGroupIds.join(", ")}`,
  );
}

function sdkInventoryDisposition(row, proposedOwnerBoundary) {
  if (seededSdkScenarioByRowId.has(row.rowId)) {
    return "seed-scenario-present";
  }
  if (row.supportSnapshot.finalDisposition === "non-runtime") {
    return "explicit-closure-needed";
  }
  if (proposedOwnerBoundary === "future-runtime-owner-before-sdk") {
    return "future-owner-before-sdk";
  }
  if (proposedOwnerBoundary === "table-only-closure") {
    return "table-only-closure-needed";
  }
  if (proposedOwnerBoundary.endsWith("-review")) {
    return "closure-review-needed";
  }
  if (
    proposedOwnerBoundary === "character-creation" ||
    proposedOwnerBoundary === "character-sheet" ||
    proposedOwnerBoundary === "multi-owner-sdk-split"
  ) {
    return "sdk-scenario-needed";
  }
  if (
    proposedOwnerBoundary === "character-sheet-or-build-closure" &&
    row.supportSnapshot.finalDisposition ===
      "catalog-installed-owner-evidence-present"
  ) {
    return "sdk-scenario-or-owner-closure-needed";
  }
  if (battleReadinessStatusIs(row, "accepted")) {
    return "sdk-scenario-needed";
  }
  if (
    row.supportSnapshot.finalDisposition === "catalog-only/dead-for-now" ||
    battleReadinessStatusIs(row, "accepted-no-battle-effect")
  ) {
    return "closure-review-needed";
  }
  if (
    row.supportSnapshot.finalDisposition ===
    "catalog-installed-owner-evidence-present"
  ) {
    return "sdk-scenario-or-owner-closure-needed";
  }
  return "inventory-review-needed";
}

function projectMiningRow(row, ownerEvidence) {
  const seedScenario = seededSdkScenarioByRowId.get(row.rowId);
  const ownerBoundary = normalizeOwnerBoundaryResult(
    ownerBoundaryForMiningRow(row, ownerEvidence),
  );
  const { proposedOwnerBoundary } = ownerBoundary;
  const disposition = sdkInventoryDisposition(row, proposedOwnerBoundary);
  return {
    rowId: row.rowId,
    levelBand: row.levelBand,
    axis: row.axis,
    rowKind: row.rowKind,
    category: row.category,
    className: row.className,
    concept: row.concept,
    candidateUnitId: row.candidateUnitId,
    source: row.source,
    supportSnapshot: row.supportSnapshot,
    finalDisposition: row.supportSnapshot.finalDisposition,
    proposedOwnerBoundary,
    sdkInventoryDisposition: disposition,
    ownerBoundaryStatus: ownerBoundaryStatus(
      proposedOwnerBoundary,
      disposition,
    ),
    ...(ownerBoundary.ownerBoundaryEvidence === undefined
      ? {}
      : {
          ownerBoundaryEvidence: ownerBoundary.ownerBoundaryEvidence,
        }),
    ...(seedScenario === undefined
      ? {}
      : {
          existingSdkScenario: seedScenario,
        }),
    nextAction: row.nextAction,
  };
}

function buildInventory() {
  const levelReports = levelReportInputs.map(levelReportSummary);
  const miningAudit = readJson(paths.miningAudit);
  const ownerEvidence = {
    unitClaimsByUnitId: indexUnitClaims(readJsonl(paths.unitClaims)),
    unitEvidenceByUnitId: indexUnitEvidence(readJsonl(paths.unitEvidence)),
    characterCreationRowsByRowId: evidenceRowsByRowId(
      paths.characterCreationOwnerEvidence,
    ),
    characterSheetRowsByRowId: evidenceRowsByRowId(
      paths.characterSheetOwnerEvidence,
    ),
  };
  const seedScenarioSources = new Map(
    Object.values(paths.seedScenarioFiles).map((seedPath) => [
      seedPath,
      fs.readFileSync(seedPath, "utf8"),
    ]),
  );
  const miningRows = miningAudit.rows
    .filter((row) => levelOneFiveBands.has(row.levelBand))
    .map((row) => projectMiningRow(row, ownerEvidence))
    .sort((left, right) => left.rowId.localeCompare(right.rowId));
  assertLocalRawSources(miningRows);
  assertSeedScenarios(seedScenarioSources, miningRows);
  const levelOneFourRows = miningRows.filter(
    (row) => row.levelBand !== "level-5" && row.levelBand !== "spell-level-3",
  );
  const level5CompletionRows = miningRows.filter(
    (row) => row.levelBand === "level-5" || row.levelBand === "spell-level-3",
  );
  const seededRows = level5CompletionRows.filter(
    (row) => row.existingSdkScenario !== undefined,
  );
  const scenarioGroups = buildScenarioGroups(miningRows);
  assertUniqueScenarioGroupIds(scenarioGroups);
  const level5ScenarioGroups = scenarioGroups.filter((group) =>
    group.levelBands.some(
      (levelBand) => levelBand === "level-5" || levelBand === "spell-level-3",
    ),
  );
  const level4FrontierUnits = uniqueSorted(
    levelReports.flatMap((report) =>
      report.frontierRows.map((row) => row.unitId),
    ),
  );

  return stable({
    schemaVersion: 4,
    generatedBy: "scripts/sdk-raw-integration-inventory.cjs",
    sourceArtifacts: {
      plan: toRepoPath(root, paths.plan),
      levelReports: Object.fromEntries(
        levelReportInputs.map((input) => [
          input.key,
          toRepoPath(root, input.path),
        ]),
      ),
      miningAudit: toRepoPath(root, paths.miningAudit),
      unitClaims: toRepoPath(root, paths.unitClaims),
      unitEvidence: toRepoPath(root, paths.unitEvidence),
      characterCreationOwnerEvidence: toRepoPath(
        root,
        paths.characterCreationOwnerEvidence,
      ),
      characterSheetOwnerEvidence: toRepoPath(
        root,
        paths.characterSheetOwnerEvidence,
      ),
      seedScenarioFiles: Object.values(paths.seedScenarioFiles).map(
        (seedPath) => toRepoPath(root, seedPath),
      ),
    },
    scope: {
      title: "Level 1-5 SDK RAW Integration Inventory",
      levelBands: Array.from(levelOneFiveBands),
      purpose:
        "Seed and track deterministic SDK integration tests against local SRD RAW for character levels 1 through 5.",
      grain:
        "Level 1-4 source artifacts are cumulative unique-unit full-support reports. Level 5 and spell-level-3 use mined source rows so completion can target exact RAW anchors.",
    },
    metrics: {
      cumulativeReports: Object.fromEntries(
        levelReports.map((report) => [
          report.key,
          {
            strictDenominator: report.summary.strictDenominator,
            nonSupportedFrontier: report.summary.nonSupportedFrontier,
            strictTargetClosure: report.strictTargetClosure,
            productReadiness: report.productReadiness,
          },
        ]),
      ),
      level4CumulativeFrontierUnitCount: level4FrontierUnits.length,
      levelOneFiveMinedRows: miningRows.length,
      levelOneFourRows: levelOneFourRows.length,
      level5CompletionRows: level5CompletionRows.length,
      level5SeedScenarioRows: seededRows.length,
      levelOneFiveRowsByLevelBand: countValues(
        miningRows.map((row) => row.levelBand),
      ),
      levelOneFiveRowsByRowKind: countValues(
        miningRows.map((row) => row.rowKind),
      ),
      levelOneFiveRowsBySdkInventoryDisposition: countValues(
        miningRows.map((row) => row.sdkInventoryDisposition),
      ),
      levelOneFiveRowsByOwnerBoundary: countValues(
        miningRows.map((row) => row.proposedOwnerBoundary),
      ),
      levelOneFiveRowsByOwnerBoundaryStatus: countValues(
        miningRows.map((row) => row.ownerBoundaryStatus),
      ),
      scenarioGroups: scenarioGroups.length,
      scenarioGroupsByTask: countValues(
        scenarioGroups.map((group) => group.taskId),
      ),
      scenarioGroupsByLane: countValues(
        scenarioGroups.map((group) => group.lane),
      ),
      level5CompletionRowsByLevelBand: countValues(
        level5CompletionRows.map((row) => row.levelBand),
      ),
      level5CompletionRowsBySdkInventoryDisposition: countValues(
        level5CompletionRows.map((row) => row.sdkInventoryDisposition),
      ),
      level5CompletionRowsByOwnerBoundary: countValues(
        level5CompletionRows.map((row) => row.proposedOwnerBoundary),
      ),
      level5CompletionRowsByOwnerBoundaryStatus: countValues(
        level5CompletionRows.map((row) => row.ownerBoundaryStatus),
      ),
      level5ScenarioGroups: level5ScenarioGroups.length,
      level5ScenarioGroupsByLane: countValues(
        level5ScenarioGroups.map((group) => group.lane),
      ),
    },
    levelReports,
    level4CumulativeFrontierUnits: level4FrontierUnits,
    seededSdkScenarioRows: seededSdkScenarioRecords,
    levelOneFiveRows: miningRows,
    scenarioGroups,
    level5ScenarioGroups,
    level5CompletionRows,
  });
}

function renderMetricBlock(inventory) {
  return [
    "| Metric | Value |",
    "| --- | ---: |",
    `| Level 1-4 cumulative frontier units | ${inventory.metrics.level4CumulativeFrontierUnitCount} |`,
    `| Level 1-5 mined rows | ${inventory.metrics.levelOneFiveMinedRows} |`,
    `| Level 1-4 row-grained inventory rows | ${inventory.metrics.levelOneFourRows} |`,
    `| Level 5 completion rows | ${inventory.metrics.level5CompletionRows} |`,
    `| Existing level-5 SDK seed scenario rows | ${inventory.metrics.level5SeedScenarioRows} |`,
    `| Scenario groups | ${inventory.metrics.scenarioGroups} |`,
    `| Level 5 scenario groups | ${inventory.metrics.level5ScenarioGroups} |`,
  ];
}

function renderCountRows(counts) {
  return Object.entries(counts).map(
    ([key, count]) => `| ${md(key)} | ${count} |`,
  );
}

function renderLevelReportRows(inventory) {
  return inventory.levelReports.map((report) => {
    const strict = report.strictTargetClosure;
    const product = report.productReadiness;
    const cells = [
      report.title,
      report.levelBands.join(", "),
      report.summary.strictDenominator,
      report.summary.nonSupportedFrontier,
      `${strict.numerator}/${strict.denominator} (${strict.percent})`,
      `${product.numerator}/${product.denominator} (${product.percent})`,
      report.sourcePath,
    ];
    return `| ${cells.map(md).join(" | ")} |`;
  });
}

function renderLevel5Rows(rows) {
  return rows.map((row) => {
    const cells = [
      row.levelBand,
      row.concept,
      `\`${row.candidateUnitId}\``,
      `\`${sourceRef(row.source)}\``,
      row.finalDisposition,
      supportSnapshotLabel(row.supportSnapshot.battleReadiness, "status"),
      row.proposedOwnerBoundary,
      row.ownerBoundaryStatus,
      row.sdkInventoryDisposition,
      row.existingSdkScenario?.label ?? "",
      row.nextAction,
    ];
    return `| ${cells.map(md).join(" | ")} |`;
  });
}

function renderScenarioGroupRows(groups) {
  return groups.map((group) => {
    const cells = [
      group.taskId,
      group.lane,
      group.rowCount,
      group.levelBands.join(", "),
      group.classNames.join(", "),
      group.candidateUnitIds.map((unitId) => `\`${unitId}\``).join(", "),
      group.sampleConcepts.join("<br>"),
      group.suggestedScenario,
    ];
    return `| ${cells.map(md).join(" | ")} |`;
  });
}

function renderInventory(inventory) {
  const level5Rows = inventory.level5CompletionRows;
  const level5ScenarioGroups = inventory.level5ScenarioGroups;
  return `${[
    "# Level 1-5 SDK RAW Inventory",
    "",
    "Generated by `scripts/sdk-raw-integration-inventory.cjs`.",
    "",
    "This inventory is the first executable artifact for",
    "`plans/LEVEL1_5_SDK_RAW_INTEGRATION_TEST_PLAN.md`. It intentionally",
    "keeps generated report facts separate from SDK integration dispositions:",
    "the generated reports say what already has owner evidence; this inventory",
    "says what still needs SDK-level scenarios or explicit SDK-scope closure.",
    "",
    "## Metrics",
    "",
    ...renderMetricBlock(inventory),
    "",
    "### All Level 1-5 Rows by Level Band",
    "",
    "| Level band | Rows |",
    "| --- | ---: |",
    ...renderCountRows(inventory.metrics.levelOneFiveRowsByLevelBand),
    "",
    "### All Level 1-5 Rows by SDK Disposition",
    "",
    "| SDK disposition | Rows |",
    "| --- | ---: |",
    ...renderCountRows(
      inventory.metrics.levelOneFiveRowsBySdkInventoryDisposition,
    ),
    "",
    "### All Level 1-5 Rows by Proposed Owner Boundary",
    "",
    "| Proposed owner boundary | Rows |",
    "| --- | ---: |",
    ...renderCountRows(inventory.metrics.levelOneFiveRowsByOwnerBoundary),
    "",
    "### All Level 1-5 Rows by Owner Boundary Status",
    "",
    "| Owner boundary status | Rows |",
    "| --- | ---: |",
    ...renderCountRows(inventory.metrics.levelOneFiveRowsByOwnerBoundaryStatus),
    "",
    "### Scenario Groups by Task",
    "",
    "| Task | Groups |",
    "| --- | ---: |",
    ...renderCountRows(inventory.metrics.scenarioGroupsByTask),
    "",
    "### Scenario Groups by Lane",
    "",
    "| Lane | Groups |",
    "| --- | ---: |",
    ...renderCountRows(inventory.metrics.scenarioGroupsByLane),
    "",
    "### Level 5 Completion Rows by SDK Disposition",
    "",
    "| SDK disposition | Rows |",
    "| --- | ---: |",
    ...renderCountRows(
      inventory.metrics.level5CompletionRowsBySdkInventoryDisposition,
    ),
    "",
    "### Level 5 Completion Rows by Proposed Owner Boundary",
    "",
    "| Proposed owner boundary | Rows |",
    "| --- | ---: |",
    ...renderCountRows(inventory.metrics.level5CompletionRowsByOwnerBoundary),
    "",
    "### Level 5 Completion Rows by Owner Boundary Status",
    "",
    "| Owner boundary status | Rows |",
    "| --- | ---: |",
    ...renderCountRows(
      inventory.metrics.level5CompletionRowsByOwnerBoundaryStatus,
    ),
    "",
    "### Level 5 Scenario Groups by Lane",
    "",
    "| Lane | Groups |",
    "| --- | ---: |",
    ...renderCountRows(inventory.metrics.level5ScenarioGroupsByLane),
    "",
    "## Cumulative Level 1-4 Source Reports",
    "",
    "| Report | Bands | Strict denominator | Non-supported frontier | Strict target closure | Product readiness | Source |",
    "| --- | --- | ---: | ---: | --- | --- | --- |",
    ...renderLevelReportRows(inventory),
    "",
    "## Existing SDK Seed Scenario Rows",
    "",
    ...inventory.seededSdkScenarioRows.map(
      (row) =>
        `- \`${row.rowId}\` / \`${row.rowKey}\`: ${row.existingSdkScenario.label}`,
    ),
    "",
    "## Level 5 Scenario Groups",
    "",
    "| Task | Lane | Rows | Bands | Classes | Units | Sample concepts | Suggested scenario |",
    "| --- | --- | ---: | --- | --- | --- | --- | --- |",
    ...renderScenarioGroupRows(level5ScenarioGroups),
    "",
    "## Level 5 and Spell-Level-3 Completion Rows",
    "",
    "| Band | Concept | Unit | RAW source | Generated disposition | Battle readiness | Proposed owner boundary | Owner boundary status | SDK disposition | Existing SDK scenario | Next action |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...renderLevel5Rows(level5Rows),
    "",
    "## Notes",
    "",
    "- The JSON inventory contains every projected level 1-5 row. The Markdown",
    "  report summarizes all rows and expands level-5 rows/groups for the next",
    "  implementation slice.",
    "- Scenario groups are implementation planning groups, not coverage evidence.",
    "  A row is not covered until a deterministic SDK test or explicit closure",
    "  asserts its RAW-facing obligation.",
    "- Supported class-feature owner boundaries are classified from",
    "  `unit-claims.jsonl` profile ids and unit-level owner-evidence rows.",
    "  `multi-owner-sdk-split` means the SDK scenario must assert each profile at",
    "  its real owner instead of pretending the feature has one owner. Unsupported",
    "  class-feature rows use exact row owner evidence when present; otherwise",
    "  closure rows are classified only by typed closure kind.",
    "- `table-only-closure` means a spell row has recorded social/knowledge",
    "  closure evidence that is table-owned rather than SDK-executable.",
    "  `spell-effect-owner-review` means the row lacks recorded closure evidence",
    "  or has a recorded closure kind that is not typed enough to split",
    "  future-owner from table-only closure.",
    "- `seed-scenario-present` means one of the tracked SDK seed scenario files",
    "  exercises the SDK path for that Unit, not that every row for that Unit is",
    "  exhaustively complete.",
    "",
  ].join("\n")}`;
}

const inventory = buildInventory();
writeSdkRawArtifact(paths.json, `${JSON.stringify(inventory, null, 2)}\n`);
writeSdkRawArtifact(paths.report, renderInventory(inventory));
