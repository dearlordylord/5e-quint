const fs = require("node:fs");
const path = require("node:path");
const { fail } = require("./unit-profile-coverage-io.cjs");
const {
  battleReadinessClosureKind,
  selectedIdentityMbtEvidenceTag,
} = require("./unit-profile-coverage-config.cjs");
const {
  percent,
  selectedIdentityEvidenceStatus,
  selectedIdentityStatus,
  stable,
} = require("./unit-profile-coverage-report.cjs");
const {
  buildRulesKernelSupportedUnitJoin,
  rulesKernelUnitJoin,
} = require("./rules-kernel-profile-join.cjs");

function characterLevelBands(maxCharacterLevel) {
  const maxSpellLevel = Math.min(9, Math.floor((maxCharacterLevel + 1) / 2));
  return [
    ...Array.from(
      { length: maxCharacterLevel },
      (_, index) => `level-${index + 1}`,
    ),
    ...Array.from(
      { length: maxSpellLevel + 1 },
      (_, spellLevel) => `spell-level-${spellLevel}`,
    ),
  ];
}

const strictLevelBands = characterLevelBands(1);
const strictLevel12Bands = characterLevelBands(2);
const strictLevel13Bands = characterLevelBands(3);
const strictLevel14Bands = characterLevelBands(4);
const companionWorktreeExcludedUnitIds = ["find_familiar"];
const srdAuthoredCharacterCreationOptionGroups = [
  {
    group: "backgrounds",
    label: "SRD backgrounds",
    unitIds: [
      "background_acolyte",
      "background_criminal",
      "background_sage",
      "background_soldier",
    ],
    source: ".references/srd-5.2.1/Character-Origins.md:33-63",
    reason:
      "SRD 5.2.1 publishes Acolyte, Criminal, Sage, and Soldier as character Background choices.",
  },
];
const level1Scope = {
  title: "Character Level 1",
  outputTitle: "Character Level 1 Full Support",
  description:
    "This strict view tracks executable SRD character-level-1, cantrip, and spell-level-1 pressure separately from the broader product readiness closure metric. Character level and spell level are separate axes.",
  levelBands: strictLevelBands,
  maxCharacterLevel: 1,
  productReadinessMetric: "levelOneBattleReadiness",
};
const level12Scope = {
  title: "Character Levels 1-2",
  outputTitle: "Character Levels 1-2 Full Support",
  description:
    "This strict view tracks executable SRD character-level-1 plus character-level-2 pressure, cantrips, and spell-level-1 pressure separately from the broader product readiness closure metric. It deliberately excludes spell-level-2 pressure, which first enters the character-level-3 frontier for full casters.",
  levelBands: strictLevel12Bands,
  maxCharacterLevel: 2,
  productReadinessMetric: "levelOneTwoBattleReadiness",
};
const level13Scope = {
  title: "Character Levels 1-3",
  outputTitle: "Character Levels 1-3 Full Support",
  description:
    "This strict view tracks executable SRD character-level-1 through character-level-3 pressure, cantrips, and spell-level-1 plus spell-level-2 pressure separately from the broader product readiness closure metric. It deliberately excludes spell-level-3 pressure, which belongs to the character-level-5 frontier for full casters.",
  levelBands: strictLevel13Bands,
  maxCharacterLevel: 3,
  productReadinessMetric: "levelOneThreeBattleReadiness",
};
const level14Scope = {
  title: "Character Levels 1-4",
  outputTitle: "Character Levels 1-4 Full Support",
  description:
    "This strict view tracks executable SRD character-level-1 through character-level-4 pressure, cantrips, and spell-level-1 plus spell-level-2 pressure separately from the broader product readiness closure metric. It adds level-4 class-feature pressure while deliberately excluding spell-level-3 pressure, which belongs to the character-level-5 frontier for full casters.",
  levelBands: strictLevel14Bands,
  maxCharacterLevel: 4,
  productReadinessMetric: "levelOneFourBattleReadiness",
};
const adoptedNoMatrixSrdPressureDecisionUnitIds = new Set([
  "create_or_destroy_water",
  "disguise_self",
  "druidcraft",
  "elementalism",
  "floating_disk",
  "goodberry",
  "illusory_script",
  "mage_hand",
  "mending",
  "message",
  "prestidigitation",
  "purify_food_and_drink",
  "unseen_servant",
]);
const strictStatusDefinitions = [
  {
    status: "supported-profile",
    strictTargetClosed: true,
    description:
      "Full support exists at the Unit profile boundary for this strict accounting scope.",
  },
  {
    status: "closed-runtime-detached-table-adjudication",
    strictTargetClosed: true,
    description:
      "The Unit claim records a runtime-detached presentation, exploration, or durable social/knowledge closure.",
  },
  {
    status: "closed-character-fact-and-runtime-detached-split",
    strictTargetClosed: true,
    description:
      "Character facts are owned while only runtime-detached adjudication remains.",
  },
  {
    status: "closed-companion-control-boundary",
    strictTargetClosed: true,
    description:
      "Companion lifecycle and control residuals are closed at the companion control boundary.",
  },
  {
    status: "closed-selection-grant-container",
    strictTargetClosed: true,
    description:
      "The Unit claim records a selection-grant container whose selected downstream Unit or Character Sheet facts own executable behavior.",
  },
  {
    status: "closed-outside-battle-runtime-boundary",
    strictTargetClosed: true,
    description:
      "The remaining residuals are explicitly outside promoted battle-runtime ownership.",
  },
  {
    status: "closed-later-level-only",
    strictTargetClosed: true,
    description:
      "The in-scope behavior is complete and every remaining residual is outside this strict accounting scope.",
  },
  {
    status: "blocked-follow-up-split",
    strictTargetClosed: true,
    description:
      "The Unit claim records concrete smaller follow-up splits for the remaining executable owner work.",
  },
  {
    status: "open-profile-accounting",
    strictTargetClosed: false,
    description:
      "A Unit claim exists, but strict support or closure accounting still needs profile, evidence, or classifier work.",
  },
  {
    status: "open-runtime-behavior",
    strictTargetClosed: false,
    description:
      "No Unit profile claim records runtime support or an accepted strict closure.",
  },
];
const strictTargetClosureStatuses = new Set(
  strictStatusDefinitions
    .filter((definition) => definition.strictTargetClosed)
    .map((definition) => definition.status),
);
const strictStatusDescriptions = new Map(
  strictStatusDefinitions.map((definition) => [
    definition.status,
    definition.description,
  ]),
);
const runtimeDetachedClosureKinds = new Set([
  battleReadinessClosureKind.outsideRuntimePresentationExploration,
]);
const durableSocialKnowledgeClosureKind =
  battleReadinessClosureKind.socialKnowledgeEffect;
const laterLevelOnlyClosureKind = battleReadinessClosureKind.laterLevelOnly;
const outsideBattleRuntimeClosureKind =
  battleReadinessClosureKind.outsideBattleRuntime;
const selectionGrantContainerClosureKind =
  battleReadinessClosureKind.selectionGrantContainer;
const tableSpatialDerivationClosureKind =
  battleReadinessClosureKind.tableSpatialDerivation;
const companionControlBoundaryClosureKind =
  battleReadinessClosureKind.companionControlBoundary;
const characterFactRuntimeDetachedSplitClosureKind =
  battleReadinessClosureKind.characterFactRuntimeDetachedSplit;
const strictClosedResidualClosureKinds = new Set([
  outsideBattleRuntimeClosureKind,
  tableSpatialDerivationClosureKind,
  battleReadinessClosureKind.outsideRuntimePresentationExploration,
]);
const d20RollModeResidualTerms = [
  "ability-check roll-mode",
  "finding advantage",
  "perception or survival",
];

function countCoverage(numerator, denominator) {
  return {
    numerator,
    denominator,
    percent: percent(numerator, denominator),
  };
}

function inventoryRowsByCandidateId(rows) {
  return rows.reduce((groups, row) => {
    const current = groups.get(row.candidateUnitId) ?? [];
    current.push(row);
    groups.set(row.candidateUnitId, current);
    return groups;
  }, new Map());
}

function buildStrictCandidateGroups(srdUnitInventory, levelBands) {
  const scopedRows = srdUnitInventory.rows.filter((row) =>
    levelBands.includes(row.levelBand),
  );
  return inventoryRowsByCandidateId(scopedRows);
}

function buildMatrixUnitsById(matrix) {
  return matrix.units.reduce((groups, unit) => {
    const current = groups.get(unit.unitId) ?? [];
    current.push(unit);
    groups.set(unit.unitId, current);
    return groups;
  }, new Map());
}

function buildSrdAuthoredCharacterCreationReadiness(matrixUnitsById) {
  const groups = srdAuthoredCharacterCreationOptionGroups.map((group) => {
    const variants = group.unitIds.map((unitId) => {
      const matrixUnit = matrixUnitsById.get(unitId)?.[0];
      const supported = matrixUnit?.catalogAdmission?.status === "installed";
      return stable({
        unitId,
        supported,
        catalogStatus: matrixUnit?.catalogAdmission?.status ?? "missing",
        sourceRecordPath: matrixUnit?.sourceRecordPath,
      });
    });
    const installedVariantIds = variants
      .filter((variant) => variant.supported)
      .map((variant) => variant.unitId);
    const missingVariantIds = variants
      .filter((variant) => !variant.supported)
      .map((variant) => variant.unitId);
    const complete = missingVariantIds.length === 0;
    return stable({
      ...group,
      complete,
      installedVariantIds,
      missingVariantIds,
      variants,
    });
  });
  const openGroups = groups.filter((group) => !group.complete);
  return stable({
    openBlockerCount: openGroups.length,
    totalGroupCount: groups.length,
    groups,
  });
}

function readJsonIfExists(root, relativePath) {
  if (root === undefined || relativePath === undefined) return undefined;
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return undefined;
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function matrixRowsForUnit(unitId, matrixUnitsById) {
  return matrixUnitsById.get(unitId) ?? [];
}

function installedMatrixRow(unitId, matrixUnitsById) {
  return matrixRowsForUnit(unitId, matrixUnitsById).find(
    (row) => row.catalogAdmission?.status === "installed",
  );
}

function representativeMatrixRow(unitId, matrixUnitsById) {
  return (
    installedMatrixRow(unitId, matrixUnitsById) ??
    matrixRowsForUnit(unitId, matrixUnitsById)[0]
  );
}

function catalogReadinessForUnit(unitId, matrixUnitsById) {
  const rows = matrixRowsForUnit(unitId, matrixUnitsById);
  if (rows.length > 1) {
    return {
      status: "duplicate-catalog-identity",
      ready: false,
      kind: rows[0].kind,
      sourceRecordPath: rows[0].sourceRecordPath,
      sourceRecordPaths: rows
        .map((row) => row.sourceRecordPath)
        .filter(Boolean)
        .sort(),
      duplicateRowCount: rows.length,
    };
  }
  const installed = rows.find(
    (row) => row.catalogAdmission?.status === "installed",
  );
  if (installed !== undefined) {
    return {
      status: "installed",
      ready: true,
      kind: installed.kind,
      sourceRecordPath: installed.sourceRecordPath,
    };
  }
  if (rows.length === 0) {
    return {
      status: "missing-authored-record",
      ready: false,
    };
  }
  return {
    status:
      rows
        .map((row) => row.catalogAdmission?.status)
        .filter(Boolean)
        .sort()
        .join(", ") || "not-installed",
    ready: false,
    kind: rows[0].kind,
    sourceRecordPath: rows[0].sourceRecordPath,
    duplicateRowCount: rows.length > 1 ? rows.length : undefined,
  };
}

function groupRowsByReadyStatus(rows) {
  return Object.fromEntries(
    Array.from(
      rows.reduce((counts, row) => {
        counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
        return counts;
      }, new Map()),
    ).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function unitRefRowsFromStartingEquipment(record, ownerUnitId, matrixUnitsById) {
  return (record.startingEquipment ?? []).flatMap((choice) =>
    (choice.items ?? [])
      .filter((item) => item.kind === "unit_ref")
      .map((item) => {
        const readiness = catalogReadinessForUnit(item.unitId, matrixUnitsById);
        return stable({
          group: "starting-equipment-unit-refs",
          ownerUnitId,
          relation: `startingEquipment.${choice.id}.unit_ref`,
          unitId: item.unitId,
          quantity: item.quantity,
          ...readiness,
        });
      }),
  );
}

function dependencyRow(ownerUnitId, relation, unitId, matrixUnitsById) {
  return stable({
    ownerUnitId,
    relation,
    unitId,
    ...catalogReadinessForUnit(unitId, matrixUnitsById),
  });
}

function uniqueRowsByKey(rows, keyFn) {
  return Array.from(
    rows
      .reduce((map, row) => {
        const key = keyFn(row);
        if (!map.has(key)) map.set(key, row);
        return map;
      }, new Map())
      .values(),
  );
}

function readinessGroup({ group, label, rows, description }) {
  const blockerRows = rows.filter((row) => !row.ready);
  return stable({
    group,
    label,
    description,
    complete: blockerRows.length === 0,
    metrics: countCoverage(rows.length - blockerRows.length, rows.length),
    rowsByStatus: groupRowsByReadyStatus(rows),
    blockerRows,
    rows,
  });
}

function srdRecordsOfKind(matrixUnitsById, kind) {
  return Array.from(matrixUnitsById.values())
    .flatMap((rows) => rows)
    .filter(
      (row) =>
        row.kind === kind &&
        row.collectionId === "srd-5.2.1" &&
        row.catalogAdmission?.status === "installed",
    )
    .sort((left, right) => left.unitId.localeCompare(right.unitId));
}

function buildSrdAuthoredProductReadiness(matrixUnitsById, scope, options = {}) {
  const root = options.root;
  const backgroundRows = srdAuthoredCharacterCreationOptionGroups[0].unitIds.map(
    (unitId) => {
      const readiness = catalogReadinessForUnit(unitId, matrixUnitsById);
      return stable({ unitId, ...readiness });
    },
  );
  const backgroundRecords = backgroundRows
    .map((row) => representativeMatrixRow(row.unitId, matrixUnitsById))
    .filter(Boolean)
    .map((row) => readJsonIfExists(root, row.sourceRecordPath))
    .filter(Boolean);
  const backgroundOriginFeatRows = backgroundRecords.map((record) =>
    dependencyRow(
      record.id,
      "background.originFeatId",
      record.originFeatId,
      matrixUnitsById,
    ),
  );
  const backgroundStartingEquipmentRows = uniqueRowsByKey(
    backgroundRecords.flatMap((record) =>
      unitRefRowsFromStartingEquipment(record, record.id, matrixUnitsById),
    ),
    (row) => `${row.ownerUnitId}:${row.relation}:${row.unitId}`,
  );

  const speciesRows = srdRecordsOfKind(matrixUnitsById, "species").map(
    (row) => ({
      unitId: row.unitId,
      ...catalogReadinessForUnit(row.unitId, matrixUnitsById),
    }),
  );
  const speciesRecords = speciesRows
    .map((row) => representativeMatrixRow(row.unitId, matrixUnitsById))
    .filter(Boolean)
    .map((row) => readJsonIfExists(root, row.sourceRecordPath))
    .filter(Boolean);
  const speciesTraitRows = uniqueRowsByKey(
    speciesRecords.flatMap((record) =>
      Object.entries(record.traits ?? {}).map(([traitKey, unitId]) =>
        dependencyRow(record.id, `species.traits.${traitKey}`, unitId, matrixUnitsById),
      ),
    ),
    (row) => `${row.ownerUnitId}:${row.relation}:${row.unitId}`,
  );

  const classRecords = srdRecordsOfKind(matrixUnitsById, "class")
    .map((row) => readJsonIfExists(root, row.sourceRecordPath))
    .filter(Boolean);
  const classFeatureGrantRows = uniqueRowsByKey(
    classRecords.flatMap((record) =>
      (record.featureGrants ?? [])
        .filter((grant) => grant.level <= scope.maxCharacterLevel)
        .map((grant) =>
          dependencyRow(
            record.id,
            `class.featureGrants.level-${grant.level}`,
            grant.unitId,
            matrixUnitsById,
          ),
        ),
    ),
    (row) => `${row.ownerUnitId}:${row.relation}:${row.unitId}`,
  );
  const classStartingEquipmentRows = uniqueRowsByKey(
    classRecords.flatMap((record) =>
      unitRefRowsFromStartingEquipment(record, record.id, matrixUnitsById),
    ),
    (row) => `${row.ownerUnitId}:${row.relation}:${row.unitId}`,
  );

  const concreteEquipmentRows = uniqueRowsByKey(
    [...backgroundStartingEquipmentRows, ...classStartingEquipmentRows],
    (row) => row.unitId,
  ).sort((left, right) => left.unitId.localeCompare(right.unitId));

  const groups = [
    readinessGroup({
      group: "background-records",
      label: "SRD background records",
      description:
        "Every SRD background selectable at character creation must be installed.",
      rows: backgroundRows,
    }),
    readinessGroup({
      group: "background-origin-feat-refs",
      label: "SRD background origin feat refs",
      description:
        "Every finalized background origin feat ref must resolve through the Unit catalog before character-to-battle admission can be claimed.",
      rows: backgroundOriginFeatRows,
    }),
    readinessGroup({
      group: "background-starting-equipment-unit-refs",
      label: "SRD background concrete equipment refs",
      description:
        "Every concrete Unit ref in SRD background starting equipment must resolve through the Unit catalog.",
      rows: backgroundStartingEquipmentRows,
    }),
    readinessGroup({
      group: "species-records",
      label: "SRD species records",
      description:
        "Every SRD species selectable at character creation must be installed.",
      rows: speciesRows,
    }),
    readinessGroup({
      group: "species-trait-refs",
      label: "SRD species trait refs",
      description:
        "Every finalized species trait ref must resolve through the Unit catalog before character-to-battle admission can be claimed.",
      rows: speciesTraitRows,
    }),
    readinessGroup({
      group: "level-scoped-class-feature-grants",
      label: `SRD class feature grants through level ${scope.maxCharacterLevel}`,
      description:
        "Every level-scoped class feature grant retained by finalization must resolve through the Unit catalog.",
      rows: classFeatureGrantRows,
    }),
    readinessGroup({
      group: "class-starting-equipment-unit-refs",
      label: "SRD class concrete equipment refs",
      description:
        "Every concrete Unit ref in SRD class starting equipment must resolve through the Unit catalog.",
      rows: classStartingEquipmentRows,
    }),
    readinessGroup({
      group: "starting-equipment-concrete-unit-refs",
      label: "Unique SRD concrete equipment refs",
      description:
        "Unique concrete weapon, armor, and shield Unit refs reachable from SRD starting equipment.",
      rows: concreteEquipmentRows,
    }),
  ];
  const blockingGroups = groups.filter((group) => !group.complete);
  const blockerRows = groups.flatMap((group) =>
    group.blockerRows.map((row) => ({ ...row, group: group.group })),
  );
  const totalRows = groups.reduce(
    (total, group) => total + group.metrics.denominator,
    0,
  );
  const readyRows = groups.reduce(
    (total, group) => total + group.metrics.numerator,
    0,
  );
  return stable({
    metrics: countCoverage(readyRows, totalRows),
    openBlockerCount: blockerRows.length,
    blockingGroupCount: blockingGroups.length,
    groups,
    blockerRows,
  });
}

function strictCandidateMatrixUnit(unitId, matrixUnitsById) {
  const units = matrixUnitsById.get(unitId) ?? [];
  if (units.length > 1) {
    fail(
      `Strict support candidate ${unitId} has ${units.length} Unit matrix rows.`,
    );
  }
  return units[0];
}

function sourceRowSummary(rows) {
  return rows
    .map((row) => ({
      category: row.category,
      concept: row.concept,
      id: row.id,
      levelBand: row.levelBand,
      rowKind: row.rowKind,
      source: row.source,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function closureKindsForClaim(claim) {
  if (Array.isArray(claim?.followUpTasks) && claim.followUpTasks.length > 0) {
    return ["follow-up-split"];
  }
  if (claim?.tag === "profile-subset-supported") {
    return Array.from(
      new Set(
        claim.deferredMechanics
          .map((entry) => entry.battleReadinessClosure?.kind)
          .filter(Boolean),
      ),
    ).sort();
  }
  return claim?.battleReadinessClosure?.kind
    ? [claim.battleReadinessClosure.kind]
    : [];
}

function closureReasonForClaim(claim) {
  if (Array.isArray(claim?.followUpTasks) && claim.followUpTasks.length > 0) {
    return claim.followUpTasks
      .map(
        (task) =>
          `${task.id}: ${task.mechanic} Owner: ${task.owner}. Required output: ${task.requiredOutput}`,
      )
      .join("; ");
  }
  if (claim?.tag === "profile-subset-supported") {
    return claim.deferredMechanics
      .map((entry) => entry.battleReadinessClosure?.reason ?? entry.mechanic)
      .filter(Boolean)
      .join("; ");
  }
  return claim?.battleReadinessClosure?.reason ?? claim?.reason ?? "";
}

function closureText(entry) {
  const closure = entry.battleReadinessClosure;
  return [entry.mechanic, closure?.owner, closure?.reason]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function hasD20RollModeResidual(entry) {
  const text = closureText(entry);
  return d20RollModeResidualTerms.some((term) => text.includes(term));
}

function acceptedRuntimeDetachedClosure(entry) {
  const closureKind = entry.battleReadinessClosure?.kind;
  if (closureKind === undefined) return false;
  if (runtimeDetachedClosureKinds.has(closureKind)) return true;
  if (closureKind === characterFactRuntimeDetachedSplitClosureKind) {
    return true;
  }
  return (
    closureKind === durableSocialKnowledgeClosureKind &&
    !hasD20RollModeResidual(entry)
  );
}

function allClosuresMatch(claim) {
  if (claim?.tag === "profile-subset-supported") {
    return (
      claim.deferredMechanics.length > 0 &&
      claim.deferredMechanics.every(acceptedRuntimeDetachedClosure)
    );
  }
  return acceptedRuntimeDetachedClosure({
    mechanic: claim?.reason,
    battleReadinessClosure: claim?.battleReadinessClosure,
  });
}

function isLaterLevelClosureBeyondScope(closure, scope) {
  return (
    closure?.kind === laterLevelOnlyClosureKind &&
    Number.isInteger(closure.firstTriggerCharacterLevel) &&
    closure.firstTriggerCharacterLevel > scope.maxCharacterLevel
  );
}

function hasOnlyLaterLevelResiduals(claim, scope) {
  if (claim?.tag === "unsupported-profile") {
    return isLaterLevelClosureBeyondScope(
      claim.battleReadinessClosure,
      scope,
    );
  }
  return (
    claim?.tag === "profile-subset-supported" &&
    claim.deferredMechanics.length > 0 &&
    claim.deferredMechanics.every((entry) =>
      isLaterLevelClosureBeyondScope(entry.battleReadinessClosure, scope),
    )
  );
}

function hasOnlyCompanionControlBoundaryResiduals(claim) {
  if (claim?.tag === "unsupported-profile") {
    return (
      claim.battleReadinessClosure?.kind === companionControlBoundaryClosureKind
    );
  }
  return (
    claim?.tag === "profile-subset-supported" &&
    claim.deferredMechanics.length > 0 &&
    claim.deferredMechanics.every(
      (entry) =>
        entry.battleReadinessClosure?.kind ===
        companionControlBoundaryClosureKind,
    )
  );
}

function hasOnlySelectionGrantContainerResiduals(claim) {
  if (claim?.tag === "unsupported-profile") {
    return (
      claim.battleReadinessClosure?.kind === selectionGrantContainerClosureKind
    );
  }
  return (
    claim?.tag === "profile-subset-supported" &&
    claim.deferredMechanics.length > 0 &&
    claim.deferredMechanics.every(
      (entry) =>
        entry.battleReadinessClosure?.kind === selectionGrantContainerClosureKind,
    )
  );
}

function hasOnlyOutsideBattleRuntimeResiduals(claim) {
  if (claim?.tag === "profile-subset-supported") {
    return (
      claim.deferredMechanics.length > 0 &&
      claim.deferredMechanics.every(
        (entry) =>
          entry.battleReadinessClosure?.kind ===
          outsideBattleRuntimeClosureKind,
      )
    );
  }
  return (
    claim?.battleReadinessClosure?.kind === outsideBattleRuntimeClosureKind
  );
}

function hasOnlyStrictClosedResiduals(claim) {
  if (claim?.tag !== "profile-subset-supported") return false;
  return (
    claim.deferredMechanics.length > 0 &&
    claim.deferredMechanics.every((entry) => {
      const closureKind = entry.battleReadinessClosure?.kind;
      return (
        closureKind !== undefined &&
        strictClosedResidualClosureKinds.has(closureKind)
      );
    })
  );
}

function hasOutsideBattleRuntimeResidual(claim) {
  if (claim?.tag !== "profile-subset-supported") return false;
  return claim.deferredMechanics.some(
    (entry) =>
      entry.battleReadinessClosure?.kind === outsideBattleRuntimeClosureKind,
  );
}

function hasCharacterFactRuntimeDetachedSplit(claim) {
  if (claim?.tag === "profile-subset-supported") {
    return claim.deferredMechanics.some(
      (entry) =>
        entry.battleReadinessClosure?.kind ===
        characterFactRuntimeDetachedSplitClosureKind,
    );
  }
  return (
    claim?.battleReadinessClosure?.kind ===
    characterFactRuntimeDetachedSplitClosureKind
  );
}

function hasFollowUpSplit(claim) {
  return Array.isArray(claim?.followUpTasks) && claim.followUpTasks.length > 0;
}

function strictStatusDescription(status, scope) {
  const description = strictStatusDescriptions.get(status);
  if (description === undefined) {
    fail(`Strict ${scope.title} support status ${status} has no description.`);
  }
  return description;
}

function strictStatusForUnit(unit, scope) {
  const claim = unit.claim;
  if (claim?.tag === "supported-profile") {
    return {
      status: "supported-profile",
      reason: "The Unit has a supported-profile claim.",
    };
  }
  if (hasFollowUpSplit(claim)) {
    return {
      status: "blocked-follow-up-split",
      reason: closureReasonForClaim(claim),
    };
  }
  if (hasOnlyLaterLevelResiduals(claim, scope)) {
    return {
      status: "closed-later-level-only",
      reason:
        closureReasonForClaim(claim) ||
        `The remaining residuals first trigger after character level ${scope.maxCharacterLevel}.`,
    };
  }
  if (hasOnlyCompanionControlBoundaryResiduals(claim)) {
    return {
      status: "closed-companion-control-boundary",
      reason:
        closureReasonForClaim(claim) ||
        "The remaining profile subset residuals are closed at the companion control boundary.",
    };
  }
  if (hasOnlySelectionGrantContainerResiduals(claim)) {
    return {
      status: "closed-selection-grant-container",
      reason:
        closureReasonForClaim(claim) ||
        "The selected downstream Unit or Character Sheet facts own executable behavior.",
    };
  }
  if (hasOnlyOutsideBattleRuntimeResiduals(claim)) {
    return {
      status: "closed-outside-battle-runtime-boundary",
      reason:
        closureReasonForClaim(claim) ||
        "The remaining profile subset residuals are closed outside promoted battle-runtime ownership.",
    };
  }
  if (hasOnlyStrictClosedResiduals(claim)) {
    const status = hasOutsideBattleRuntimeResidual(claim)
      ? "closed-outside-battle-runtime-boundary"
      : "closed-runtime-detached-table-adjudication";
    return {
      status,
      reason:
        closureReasonForClaim(claim) ||
        "The remaining profile subset residuals are closed at explicit non-runtime or table-owned boundaries.",
    };
  }
  if (
    (claim?.tag === "unsupported-profile" ||
      claim?.tag === "profile-subset-supported") &&
    hasCharacterFactRuntimeDetachedSplit(claim)
  ) {
    return {
      status: "closed-character-fact-and-runtime-detached-split",
      reason:
        closureReasonForClaim(claim) ||
        "Durable character facts are owned while adjudication stays runtime-detached.",
    };
  }
  if (
    (claim?.tag === "unsupported-profile" ||
      claim?.tag === "profile-subset-supported") &&
    allClosuresMatch(claim)
  ) {
    return {
      status: "closed-runtime-detached-table-adjudication",
      reason:
        closureReasonForClaim(claim) ||
        "The remaining rule pressure is closed outside product runtime support.",
    };
  }
  if (claim === undefined) {
    return {
      status: "open-runtime-behavior",
      reason:
        "No Unit profile claim currently records runtime support or an accepted closure.",
    };
  }
  return {
    status: "open-profile-accounting",
    reason:
      closureReasonForClaim(claim) ||
      "The Unit has profile or closure accounting that is not strict-closed yet.",
  };
}

function rowForStrictUnit(unit, sourceRows, rulesKernelProfileJoin, scope) {
  const status = strictStatusForUnit(unit, scope);
  return stable({
    unitId: unit.unitId,
    status: status.status,
    reason: status.reason,
    strictTargetClosed: strictTargetClosureStatuses.has(status.status),
    claimTag: unit.claim?.tag ?? "missing",
    catalogStatus: unit.catalogAdmission?.status,
    catalogDisposition: unit.catalogAdmission?.disposition,
    collectionId: unit.collectionId,
    executableMechanics: unit.executableMechanics,
    kind: unit.kind,
    selectedIdentity: selectedIdentityEvidenceStatus(
      unit,
      selectedIdentityMbtEvidenceTag,
    ),
    sourceRecordPath: unit.sourceRecordPath,
    closureKinds: closureKindsForClaim(unit.claim),
    rulesKernel:
      unit.claim?.tag === "supported-profile"
        ? rulesKernelUnitJoin(unit, rulesKernelProfileJoin)
        : undefined,
    sourceRows: sourceRowSummary(sourceRows),
  });
}

function groupRowsByStatus(rows, scope) {
  return Array.from(
    rows
      .reduce((groups, row) => {
        const current = groups.get(row.status) ?? {
          status: row.status,
          description: strictStatusDescription(row.status, scope),
          unitIds: [],
        };
        current.unitIds.push(row.unitId);
        groups.set(row.status, current);
        return groups;
      }, new Map())
      .values(),
  )
    .map((group) => ({
      ...group,
      count: group.unitIds.length,
      unitIds: group.unitIds.sort(),
    }))
    .sort((a, b) => b.count - a.count || a.status.localeCompare(b.status));
}

function groupRowsByClaimTag(rows) {
  return Object.fromEntries(
    Array.from(
      rows.reduce((counts, row) => {
        counts.set(row.claimTag, (counts.get(row.claimTag) ?? 0) + 1);
        return counts;
      }, new Map()),
    ).sort(([a], [b]) => a.localeCompare(b)),
  );
}

function groupRowsBySelectedIdentityStatus(rows) {
  return Object.fromEntries(
    Array.from(
      rows.reduce((counts, row) => {
        counts.set(
          row.selectedIdentity.status,
          (counts.get(row.selectedIdentity.status) ?? 0) + 1,
        );
        return counts;
      }, new Map()),
    ).sort(([a], [b]) => a.localeCompare(b)),
  );
}

const selectedIdentityReadyStatuses = new Set([
  selectedIdentityStatus.notApplicable,
  selectedIdentityStatus.witnessPresent,
]);

function buildSelectedIdentityReadiness(rows) {
  const applicableRows = rows.filter(
    (row) => row.selectedIdentity.status !== selectedIdentityStatus.notRequired,
  );
  const readyRows = applicableRows.filter((row) =>
    selectedIdentityReadyStatuses.has(row.selectedIdentity.status),
  );
  const blockingRows = applicableRows.filter(
    (row) => !selectedIdentityReadyStatuses.has(row.selectedIdentity.status),
  );

  return stable({
    blockingRows: blockingRows
      .map((row) => ({
        claimTag: row.claimTag,
        reason: row.selectedIdentity.reason,
        selectedIdentityStatus: row.selectedIdentity.status,
        sourceRecordPath: row.sourceRecordPath,
        status: row.status,
        unitId: row.unitId,
      }))
      .sort((a, b) => a.unitId.localeCompare(b.unitId)),
    blockingRowsByStatus: groupRowsBySelectedIdentityStatus(blockingRows),
    metrics: countCoverage(readyRows.length, applicableRows.length),
    readyRowsByStatus: groupRowsBySelectedIdentityStatus(readyRows),
    rowsByStatus: groupRowsBySelectedIdentityStatus(rows),
  });
}

function outsideRow(unitId, sourceRows, extra = {}) {
  return stable({
    unitId,
    sourceRows: sourceRowSummary(sourceRows),
    ...extra,
  });
}

function noMatrixDecisionArtifactPath(unitId, root) {
  if (!adoptedNoMatrixSrdPressureDecisionUnitIds.has(unitId)) {
    return undefined;
  }
  const artifactPath = `plans/unit-profile-coverage/frontier-decisions/${unitId}.md`;
  if (root !== undefined && !fs.existsSync(path.join(root, artifactPath))) {
    fail(
      `No-matrix SRD pressure decision for ${unitId} points to missing ${artifactPath}.`,
    );
  }
  return artifactPath;
}

function noMatrixPressureSourceDescription(sourceRows) {
  const rowKinds = new Set(sourceRows.map((row) => row.rowKind));
  const levelBands = Array.from(
    new Set(sourceRows.map((row) => row.levelBand)),
  ).sort();
  const levelBandLabel = levelBands.join("/");

  if (rowKinds.size === 1 && rowKinds.has("spell-unit-pressure")) {
    return `${levelBandLabel} spell-list Unit pressure`;
  }
  if (rowKinds.size === 1 && rowKinds.has("class-feature-grant")) {
    return `${levelBandLabel} class-feature pressure`;
  }
  return `${levelBandLabel} SRD pressure`;
}

function noMatrixSrdPressureRow(unitId, sourceRows, root) {
  const decisionArtifact = noMatrixDecisionArtifactPath(unitId, root);
  const pressureSource = noMatrixPressureSourceDescription(sourceRows);
  return outsideRow(unitId, sourceRows, {
    ...(decisionArtifact === undefined ? {} : { decisionArtifact }),
    reason:
      decisionArtifact === undefined
        ? `The SRD row has ${pressureSource}, but no Unit matrix row exists yet.`
        : `The SRD row has ${pressureSource} and an adopted no-matrix frontier decision artifact; no Unit matrix row exists.`,
  });
}

function validateAdoptedNoMatrixSrdPressureDecisions(
  candidateRowsByUnitId,
  matrixUnitsById,
  root,
) {
  for (const unitId of adoptedNoMatrixSrdPressureDecisionUnitIds) {
    if (!candidateRowsByUnitId.has(unitId)) {
      fail(
        `No-matrix SRD pressure decision for ${unitId} is not backed by strict SRD pressure rows.`,
      );
    }
    const matrixRows = matrixUnitsById.get(unitId) ?? [];
    if (matrixRows.length > 0) {
      fail(
        `No-matrix SRD pressure decision for ${unitId} conflicts with ${matrixRows.length} Unit matrix row(s).`,
      );
    }
    noMatrixDecisionArtifactPath(unitId, root);
  }
}

function buildStrictFullSupport(matrix, srdUnitInventory, scope, options = {}) {
  const candidateRowsByUnitId = buildStrictCandidateGroups(
    srdUnitInventory,
    scope.levelBands,
  );
  const candidateUnitIds = Array.from(candidateRowsByUnitId.keys()).sort();
  const excludedUnitIds = new Set(companionWorktreeExcludedUnitIds);
  const matrixUnitsById = buildMatrixUnitsById(matrix);
  validateAdoptedNoMatrixSrdPressureDecisions(
    candidateRowsByUnitId,
    matrixUnitsById,
    options.root,
  );
  const outsideDenominator = {
    companionWorktree: [],
    noMatrixSrdPressure: [],
    nonExecutableClassContainers: [],
  };
  const strictRows = [];

  for (const unitId of candidateUnitIds) {
    const sourceRows = candidateRowsByUnitId.get(unitId);
    if (excludedUnitIds.has(unitId)) {
      outsideDenominator.companionWorktree.push(
        outsideRow(unitId, sourceRows, {
          reason:
            "Companion and familiar runtime work is owned by the separate companion worktree.",
        }),
      );
      continue;
    }

    const matrixUnit = strictCandidateMatrixUnit(unitId, matrixUnitsById);
    if (matrixUnit === undefined) {
      outsideDenominator.noMatrixSrdPressure.push(
        noMatrixSrdPressureRow(unitId, sourceRows, options.root),
      );
      continue;
    }

    if (!matrixUnit.executableMechanics) {
      outsideDenominator.nonExecutableClassContainers.push(
        outsideRow(unitId, sourceRows, {
          kind: matrixUnit.kind,
          reason:
            "The Unit joins the matrix, but it has no executable mechanics and is outside the strict executable denominator.",
          sourceRecordPath: matrixUnit.sourceRecordPath,
        }),
      );
      continue;
    }

    strictRows.push(
      rowForStrictUnit(
        matrixUnit,
        sourceRows,
        matrix.rulesKernelProfileJoin,
        scope,
      ),
    );
  }

  const strictRuntimeProfileSupport = strictRows.filter(
    (row) => row.status === "supported-profile",
  );
  const supportedStrictMatrixUnits = strictRuntimeProfileSupport
    .map((row) => matrixUnitsById.get(row.unitId)?.[0])
    .filter(Boolean);
  const rulesKernelSupportedUnitJoin = buildRulesKernelSupportedUnitJoin(
    supportedStrictMatrixUnits,
    matrix.rulesKernelProfileJoin,
  );
  const rulesKernelProfileIds = new Set(
    rulesKernelSupportedUnitJoin.units.flatMap((unit) =>
      unit.profiles.map((profile) => profile.profileId),
    ),
  );
  const rulesKernelCoveredProfileIds = new Set(
    rulesKernelSupportedUnitJoin.units.flatMap((unit) =>
      unit.profiles
        .filter((profile) => profile.joinStatus === "covered")
        .map((profile) => profile.profileId),
    ),
  );
  const rulesKernelMappedProfileIds = new Set(
    rulesKernelSupportedUnitJoin.units.flatMap((unit) =>
      unit.profiles
        .filter((profile) => profile.joinStatus !== "unmapped")
        .map((profile) => profile.profileId),
    ),
  );
  const strictTargetClosure = strictRows.filter(
    (row) => row.strictTargetClosed,
  );
  const strictTargetClosureMetric = countCoverage(
    strictTargetClosure.length,
    strictRows.length,
  );
  const selectedIdentityReadiness = buildSelectedIdentityReadiness(strictRows);
  const frontierRows = strictRows.filter(
    (row) => row.status !== "supported-profile",
  );
  const groups = groupRowsByStatus(strictRows, scope);
  const openFrontier = groups.filter(
    (group) => !strictTargetClosureStatuses.has(group.status),
  );

  const productReadiness =
    srdUnitInventory.metrics[scope.productReadinessMetric];
  if (productReadiness === undefined) {
    fail(`SRD Unit inventory lacks ${scope.productReadinessMetric}.`);
  }
  const srdAuthoredProductReadiness = buildSrdAuthoredProductReadiness(
    matrixUnitsById,
    scope,
    options,
  );
  const strictTargetOpenCount =
    strictTargetClosureMetric.denominator - strictTargetClosureMetric.numerator;
  const selectedIdentityBlockerCount =
    selectedIdentityReadiness.blockingRows.length;
  const authoredReadinessBlockerCount =
    srdAuthoredProductReadiness.openBlockerCount;
  const claimGateStatus =
    strictTargetOpenCount === 0 &&
    selectedIdentityBlockerCount === 0 &&
    authoredReadinessBlockerCount === 0
      ? "pass"
      : "blocked";

  return stable({
    generatedBy: "scripts/unit-profile-coverage-check.cjs",
    sourceArtifacts: {
      unitMatrix: "plans/unit-profile-coverage/unit-matrix.json",
      srdUnitInventory: "plans/unit-profile-coverage/srd-unit-inventory.json",
    },
    scope: {
      title: scope.title,
      levelBands: scope.levelBands,
      excludedUnitIds: companionWorktreeExcludedUnitIds,
      denominatorRule:
        "unique candidateUnitId rows joined to executable Unit matrix rows",
    },
    metrics: {
      strictRuntimeProfileSupport: countCoverage(
        strictRuntimeProfileSupport.length,
        strictRows.length,
      ),
      strictTargetClosure: strictTargetClosureMetric,
      productReadiness,
      rulesKernelProfileJoin: countCoverage(
        rulesKernelMappedProfileIds.size,
        rulesKernelProfileIds.size,
      ),
      rulesKernelCoveredProfileJoin: countCoverage(
        rulesKernelCoveredProfileIds.size,
        rulesKernelProfileIds.size,
      ),
      rulesKernelSupportedUnitCoverage:
        rulesKernelSupportedUnitJoin.metrics.rulesKernelSupportedUnitCoverage,
    },
    selectedIdentityReadiness,
    srdAuthoredProductReadiness,
    claimGate: {
      status: claimGateStatus,
      strictTargetOpenCount,
      selectedIdentityBlockerCount,
      authoredReadinessBlockerCount,
    },
    srdAuthoredCharacterCreationReadiness:
      buildSrdAuthoredCharacterCreationReadiness(matrixUnitsById),
    summary: {
      candidateUnitIdsBeforeExclusions: candidateUnitIds.length,
      strictDenominator: strictRows.length,
      nonSupportedFrontier:
        strictRows.length - strictRuntimeProfileSupport.length,
      groupsByClaimTag: groupRowsByClaimTag(strictRows),
      groupsByStatus: Object.fromEntries(
        groups.map((group) => [group.status, group.count]),
      ),
    },
    groups,
    rulesKernelSupportedUnitJoin,
    frontierRows: frontierRows.sort((a, b) => a.unitId.localeCompare(b.unitId)),
    openFrontier,
    outsideDenominator,
  });
}

function buildLevel1FullSupport(matrix, srdUnitInventory, options = {}) {
  return buildStrictFullSupport(matrix, srdUnitInventory, level1Scope, options);
}

function buildLevel12FullSupport(matrix, srdUnitInventory, options = {}) {
  return buildStrictFullSupport(
    matrix,
    srdUnitInventory,
    level12Scope,
    options,
  );
}

function buildLevel13FullSupport(matrix, srdUnitInventory, options = {}) {
  return buildStrictFullSupport(
    matrix,
    srdUnitInventory,
    level13Scope,
    options,
  );
}

function buildLevel14FullSupport(matrix, srdUnitInventory, options = {}) {
  return buildStrictFullSupport(
    matrix,
    srdUnitInventory,
    level14Scope,
    options,
  );
}

function md(value) {
  return String(value ?? "")
    .replace(/\n/g, " ")
    .replace(/\|/g, "\\|");
}

function mdUnitIds(unitIds) {
  if (unitIds.length === 0) return "_none_";
  return unitIds.map((unitId) => `\`${unitId}\``).join(", ");
}

function profileFollowUpTaskIds(profile) {
  return [
    ...(profile.followUpTaskIds ?? []),
    ...profile.obligations.flatMap(
      (obligation) => obligation.followUpTaskIds ?? [],
    ),
  ];
}

function renderRulesKernelFollowUpTaskIds(taskIds) {
  const uniqueTaskIds = Array.from(new Set(taskIds)).sort();
  if (uniqueTaskIds.length === 0) return "_plan-update-required_";
  return uniqueTaskIds.map((taskId) => `\`${taskId}\``).join(", ");
}

function renderMetric(metric) {
  return `${metric.numerator}/${metric.denominator} (${metric.percent})`;
}

function renderOutsideRows(rows) {
  return rows.length === 0
    ? ["| _none_ | 0 | _none_ | _none_ |"]
    : rows.map((row) => {
        const concepts = row.sourceRows
          .map((sourceRow) => sourceRow.concept)
          .filter(Boolean)
          .join("; ");
        return `| \`${row.unitId}\` | ${row.sourceRows.length} | ${md(row.reason)} | ${md(concepts)} |`;
      });
}

function renderNoMatrixRows(rows) {
  return rows.length === 0
    ? ["| _none_ | 0 | _none_ | _none_ | _none_ |"]
    : rows.map((row) => {
        const concepts = row.sourceRows
          .map((sourceRow) => sourceRow.concept)
          .filter(Boolean)
          .join("; ");
        const decisionArtifact =
          row.decisionArtifact === undefined
            ? "_none_"
            : `\`${row.decisionArtifact}\``;
        return `| \`${row.unitId}\` | ${row.sourceRows.length} | ${md(row.reason)} | ${decisionArtifact} | ${md(concepts)} |`;
      });
}

function renderReadinessGroupRows(groups) {
  return groups.map((group) => {
    const status = group.complete ? "complete" : "blocked";
    return `| ${group.label} | ${status} | ${renderMetric(group.metrics)} | ${md(group.description)} |`;
  });
}

function renderProductReadinessStatusRows(metric) {
  return Object.entries(metric.rowsByStatus).map(
    ([status, count]) => `| ${md(status)} | ${count} |`,
  );
}

function renderSelectedIdentityStatusRows(groupsBySelectedIdentityStatus) {
  return Object.entries(groupsBySelectedIdentityStatus).map(
    ([status, count]) => `| ${md(status)} | ${count} |`,
  );
}

function renderReadinessBlockerRows(rows) {
  if (rows.length === 0) {
    return ["| _none_ | _none_ | _none_ | _none_ | _none_ |"];
  }
  return rows.map(
    (row) =>
      `| ${row.group} | \`${row.ownerUnitId ?? "_root_"}\` | ${md(row.relation ?? "self")} | \`${row.unitId}\` | ${md(row.status)} |`,
  );
}

function gateStatus(metric) {
  return metric.numerator === metric.denominator ? "pass" : "blocked";
}

function blockingIssue(count, description) {
  return count === 0 ? "_none_" : `${count} ${description}`;
}

function renderFullSupportGateRows(report) {
  const strictTargetOpenCount =
    report.metrics.strictTargetClosure.denominator -
    report.metrics.strictTargetClosure.numerator;
  const selectedIdentityBlockerCount =
    report.selectedIdentityReadiness.blockingRows.length;
  const authoredReadinessBlockerCount =
    report.srdAuthoredProductReadiness.openBlockerCount;

  return [
    `| Strict runtime/profile closure | ${gateStatus(report.metrics.strictTargetClosure)} | ${renderMetric(report.metrics.strictTargetClosure)} | ${blockingIssue(strictTargetOpenCount, "strict denominator row(s) still open")} |`,
    `| Selected identity readiness | ${gateStatus(report.selectedIdentityReadiness.metrics)} | ${renderMetric(report.selectedIdentityReadiness.metrics)} | ${blockingIssue(selectedIdentityBlockerCount, "selected-identity blocker row(s)")} |`,
    `| SRD authored product readiness | ${authoredReadinessBlockerCount === 0 ? "pass" : "blocked"} | ${renderMetric(report.srdAuthoredProductReadiness.metrics)} | ${blockingIssue(authoredReadinessBlockerCount, "unresolved authored readiness row(s)")} |`,
  ];
}

function renderSelectedIdentityBlockerRows(rows) {
  return rows.length === 0
    ? ["| _none_ | _none_ | _none_ | _none_ | _none_ |"]
    : rows.map(
        (row) =>
          `| \`${row.unitId}\` | ${row.status} | ${row.claimTag} | ${row.selectedIdentityStatus} | ${md(row.reason)} |`,
      );
}

function renderClaimDiagnosticSeparation(report) {
  return `The full-support claim gate uses strict target closure, selected identity readiness, and SRD-authored product readiness. Diagnostic product readiness is a source-row accounting view, so it can report ${renderMetric(report.metrics.productReadiness)} while the claim gate reports **${report.claimGate.status}** when every non-green diagnostic row is outside those gate blockers or is represented by an explicit follow-up/accounting owner.`;
}

function renderStrictFullSupport(report, scope) {
  return `${[
    `# ${scope.outputTitle}`,
    "",
    "Generated by `scripts/unit-profile-coverage-check.cjs` from `plans/unit-profile-coverage/unit-matrix.json` and `plans/unit-profile-coverage/srd-unit-inventory.json`.",
    "",
    scope.description,
    "",
    "## Claim Summary",
    "",
    `Full-support claim: **${report.claimGate.status}**.`,
    "",
    `Blockers: strict=${report.claimGate.strictTargetOpenCount}, selected-identity=${report.claimGate.selectedIdentityBlockerCount}, SRD-authored-readiness=${report.claimGate.authoredReadinessBlockerCount}.`,
    "",
    "## Metrics",
    "",
    "| Metric | Result |",
    "| --- | ---: |",
    `| Strict runtime/profile support | ${renderMetric(report.metrics.strictRuntimeProfileSupport)} |`,
    `| Strict target closure | ${renderMetric(report.metrics.strictTargetClosure)} |`,
    `| Selected identity readiness | ${renderMetric(report.selectedIdentityReadiness.metrics)} |`,
    `| Diagnostic product readiness | ${renderMetric(report.metrics.productReadiness)} |`,
    `| SRD authored product readiness | ${renderMetric(report.srdAuthoredProductReadiness.metrics)} |`,
    `| Rules-kernel profile join | ${renderMetric(report.metrics.rulesKernelProfileJoin)} |`,
    `| Rules-kernel covered profile join | ${renderMetric(report.metrics.rulesKernelCoveredProfileJoin)} |`,
    `| Supported Unit rules-kernel chain | ${renderMetric(report.metrics.rulesKernelSupportedUnitCoverage)} |`,
    "",
    "These metrics are lower-layer accounting views. They are not, by themselves, a valid full-support claim.",
    "",
    renderClaimDiagnosticSeparation(report),
    "",
    "### Diagnostic Product Readiness Accounting",
    "",
    "Diagnostic product readiness keeps lower-layer planning pressure visible. Rows in statuses other than `accepted` or `accepted-no-battle-effect` stay visible here, but they do not block the full-support claim unless they also appear in SRD-authored readiness blockers. If a diagnostic status should become a blocker, promote that rule into the checker gate with self-test coverage instead of inferring it from this percentage.",
    "",
    "| Status | Rows |",
    "| --- | ---: |",
    ...renderProductReadinessStatusRows(report.metrics.productReadiness),
    "",
    "### Selected Identity Replay Accounting",
    "",
    "This is the selected-identity gate layer for the strict denominator. `witness-present` means a concrete selected Unit identity reaches an MBT/QNT replay owner; `not-applicable` is an explicit whole-claim non-applicable disposition; `not-required` is outside this gate denominator rather than a green row. `missing-witness-deferred-not-applicable` means the claim still lacks a replay witness for its supported runtime portion while the deferred closed portion is explicitly outside selected-identity replay.",
    "",
    "| Selected identity status | Rows |",
    "| --- | ---: |",
    ...renderSelectedIdentityStatusRows(
      report.selectedIdentityReadiness.rowsByStatus,
    ),
    "",
    "### Selected Identity Blockers",
    "",
    "| Unit | Strict status | Claim | Selected identity status | Reason |",
    "| --- | --- | --- | --- | --- |",
    ...renderSelectedIdentityBlockerRows(
      report.selectedIdentityReadiness.blockingRows,
    ),
    "",
    "## Full-Support Claim Gate",
    "",
    "| Gate | Status | Result | Blocking issue |",
    "| --- | --- | ---: | --- |",
    ...renderFullSupportGateRows(report),
    "",
    "Every gate row must pass for a full level-support claim. A 100% result in one layer does not satisfy another layer, failed gates are not combined into a weighted completion percentage, and diagnostic product-readiness rows are intentionally absent from this gate unless they enter the SRD-authored blocker set.",
    "",
    "## SRD-Authored Product Readiness",
    "",
    "This gate checks authored records and retained Unit references that must resolve before finalized characters can honestly be called product-ready. It is intentionally propagated across level reports so higher-level and future PHB+ readiness inherit the same admission discipline.",
    "",
    "| Group | Status | Ready | Meaning |",
    "| --- | --- | ---: | --- |",
    ...renderReadinessGroupRows(report.srdAuthoredProductReadiness.groups),
    "",
    "### Readiness Blockers",
    "",
    "| Group | Owner Unit | Relation | Blocking Unit | Status |",
    "| --- | --- | --- | --- | --- |",
    ...renderReadinessBlockerRows(report.srdAuthoredProductReadiness.blockerRows),
    "",
    "## Legacy SRD-Authored Character Creation Catalog",
    "",
    "| Group | Status | Installed records | Missing SRD records | Source |",
    "| --- | --- | --- | --- | --- |",
    ...report.srdAuthoredCharacterCreationReadiness.groups.map((group) => {
      const installed =
        group.installedVariantIds.map((unitId) => `\`${unitId}\``).join(", ") ||
        "_none_";
      const missing =
        group.missingVariantIds.map((unitId) => `\`${unitId}\``).join(", ") ||
        "_none_";
      const status = group.complete ? "complete" : "incomplete";
      return `| ${group.label} | ${status} | ${installed} | ${missing} | \`${group.source}\` |`;
    }),
    "",
    "## Scope",
    "",
    "| Scope fact | Count |",
    "| --- | ---: |",
    `| Candidate Unit ids before exclusions | ${report.summary.candidateUnitIdsBeforeExclusions} |`,
    `| Companion-worktree exclusions | ${report.outsideDenominator.companionWorktree.length} |`,
    `| SRD pressure with no Unit matrix row | ${report.outsideDenominator.noMatrixSrdPressure.length} |`,
    `| Non-executable class containers | ${report.outsideDenominator.nonExecutableClassContainers.length} |`,
    `| Strict executable denominator | ${report.summary.strictDenominator} |`,
    `| Non-supported frontier | ${report.summary.nonSupportedFrontier} |`,
    "",
    "## Status Groups",
    "",
    "| Status | Count | Units |",
    "| --- | ---: | --- |",
    ...report.groups.map(
      (group) =>
        `| ${group.status} | ${group.count} | ${mdUnitIds(group.unitIds)} |`,
    ),
    "",
    "## Open Frontier",
    "",
    "| Status | Count | Units |",
    "| --- | ---: | --- |",
    ...(report.openFrontier.length === 0
      ? ["| _none_ | 0 | _none_ |"]
      : report.openFrontier.map(
          (group) =>
            `| ${group.status} | ${group.count} | ${mdUnitIds(group.unitIds)} |`,
        )),
    "",
    "## Rules-Kernel Join",
    "",
    "`plans/unit-profile-coverage/` owns this strict authored-content view. `plans/rules-kernel-coverage/profile-obligations.jsonl` owns the reducer-semantic join for supported profiles.",
    "",
    "| Unit | Status | Profiles Needing Attention | Follow-up tasks |",
    "| --- | --- | --- | --- |",
    ...(report.rulesKernelSupportedUnitJoin.units.filter(
      (row) => row.joinStatus !== "covered",
    ).length === 0
      ? ["| _none_ | _none_ | _none_ | _none_ |"]
      : report.rulesKernelSupportedUnitJoin.units
          .filter((row) => row.joinStatus !== "covered")
          .map((row) => {
            const profiles = row.profiles
              .filter((profile) => profile.joinStatus !== "covered")
              .map((profile) => {
                const obligations =
                  profile.obligations.length === 0
                    ? "no obligation mapping"
                    : profile.obligations
                        .map(
                          (obligation) =>
                            `\`${obligation.obligationId}\` (${obligation.status})`,
                        )
                        .join(", ");
                return `\`${profile.profileId}\` (${profile.joinStatus}: ${obligations})`;
              })
              .join("; ");
            const followUpTasks = renderRulesKernelFollowUpTaskIds(
              row.profiles.flatMap(profileFollowUpTaskIds),
            );
            return `| \`${row.unitId}\` | ${row.joinStatus} | ${profiles} | ${followUpTasks} |`;
          })),
    "",
    "## Non-Supported Frontier Detail",
    "",
    "| Unit | Status | Claim | Selected identity | Catalog | Closure kinds | Reason |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...report.frontierRows.map(
      (row) =>
        `| \`${row.unitId}\` | ${row.status} | ${row.claimTag} | ${row.selectedIdentity.status} | ${row.catalogStatus ?? "missing"} | ${row.closureKinds.length === 0 ? "_none_" : row.closureKinds.join(", ")} | ${md(row.reason)} |`,
    ),
    "",
    "## Outside Denominator Pressure",
    "",
    "### Companion Worktree",
    "",
    "| Unit | Source rows | Reason | Concepts |",
    "| --- | ---: | --- | --- |",
    ...renderOutsideRows(report.outsideDenominator.companionWorktree),
    "",
    "### Non-Executable Class Containers",
    "",
    "| Unit | Source rows | Reason | Concepts |",
    "| --- | ---: | --- | --- |",
    ...renderOutsideRows(
      report.outsideDenominator.nonExecutableClassContainers,
    ),
    "",
    "### No Matrix SRD Pressure",
    "",
    "| Unit | Source rows | Reason | Adopted decision artifact | Concepts |",
    "| --- | ---: | --- | --- | --- |",
    ...renderNoMatrixRows(report.outsideDenominator.noMatrixSrdPressure),
    "",
  ].join("\n")}`;
}

function renderLevel1FullSupport(report) {
  return renderStrictFullSupport(report, level1Scope);
}

function renderLevel12FullSupport(report) {
  return renderStrictFullSupport(report, level12Scope);
}

function renderLevel13FullSupport(report) {
  return renderStrictFullSupport(report, level13Scope);
}

function renderLevel14FullSupport(report) {
  return renderStrictFullSupport(report, level14Scope);
}

module.exports = {
  characterLevelBands,
  buildLevel1FullSupport,
  buildLevel12FullSupport,
  buildLevel13FullSupport,
  buildLevel14FullSupport,
  buildSrdAuthoredProductReadiness,
  buildSelectedIdentityReadiness,
  strictStatusForUnitForTest: (unit, maxCharacterLevel) =>
    strictStatusForUnit(unit, {
      title: `Character Levels 1-${maxCharacterLevel}`,
      maxCharacterLevel,
    }),
  renderLevel1FullSupport,
  renderLevel12FullSupport,
  renderLevel13FullSupport,
  renderLevel14FullSupport,
};
