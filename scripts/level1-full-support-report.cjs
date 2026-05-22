const fs = require("node:fs");
const path = require("node:path");
const { fail } = require("./unit-profile-coverage-io.cjs");
const {
  battleReadinessClosureKind,
} = require("./unit-profile-coverage-config.cjs");
const { percent, stable } = require("./unit-profile-coverage-report.cjs");
const {
  buildRulesKernelSupportedUnitJoin,
  rulesKernelUnitJoin,
} = require("./rules-kernel-profile-join.cjs");

const strictLevelBands = ["level-1", "spell-level-0", "spell-level-1"];
const strictLevel12Bands = [
  "level-1",
  "level-2",
  "spell-level-0",
  "spell-level-1",
  "spell-level-2",
];
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
  title: "Level 1",
  outputTitle: "Level 1 Full Support",
  description:
    "This strict view tracks executable SRD level-1, cantrip, and level-1 spell pressure separately from the broader product readiness closure metric.",
  levelBands: strictLevelBands,
  productReadinessMetric: "levelOneBattleReadiness",
};
const level12Scope = {
  title: "Level 1-2",
  outputTitle: "Level 1-2 Full Support",
  description:
    "This strict view tracks executable SRD level-1 plus level-2 class pressure, cantrips, and level-1 plus level-2 spell pressure separately from the broader product readiness closure metric.",
  levelBands: strictLevel12Bands,
  productReadinessMetric: "levelOneTwoBattleReadiness",
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

function hasOnlyLaterLevelResiduals(claim) {
  return (
    claim?.tag === "profile-subset-supported" &&
    claim.deferredMechanics.length > 0 &&
    claim.deferredMechanics.every(
      (entry) =>
        entry.battleReadinessClosure?.kind === laterLevelOnlyClosureKind,
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

function strictStatusForUnit(unit) {
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
  if (hasOnlyLaterLevelResiduals(claim)) {
    return {
      status: "closed-later-level-only",
      reason:
        closureReasonForClaim(claim) ||
        "The remaining profile subset residuals occur only after level 1.",
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

function rowForStrictUnit(unit, sourceRows, rulesKernelProfileJoin) {
  const status = strictStatusForUnit(unit);
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

function noMatrixSrdPressureRow(unitId, sourceRows, root) {
  const decisionArtifact = noMatrixDecisionArtifactPath(unitId, root);
  return outsideRow(unitId, sourceRows, {
    ...(decisionArtifact === undefined ? {} : { decisionArtifact }),
    reason:
      decisionArtifact === undefined
        ? "The SRD row has level-1 spell pressure, but no Unit matrix row exists yet."
        : "The SRD row has level-1 spell pressure and an adopted no-matrix frontier decision artifact; no Unit matrix row exists.",
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
      rowForStrictUnit(matrixUnit, sourceRows, matrix.rulesKernelProfileJoin),
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
      strictTargetClosure: countCoverage(
        strictTargetClosure.length,
        strictRows.length,
      ),
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

function md(value) {
  return String(value ?? "")
    .replace(/\n/g, " ")
    .replace(/\|/g, "\\|");
}

function mdUnitIds(unitIds) {
  if (unitIds.length === 0) return "_none_";
  return unitIds.map((unitId) => `\`${unitId}\``).join(", ");
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

function renderStrictFullSupport(report, scope) {
  return `${[
    `# ${scope.outputTitle}`,
    "",
    "Generated by `scripts/unit-profile-coverage-check.cjs` from `plans/unit-profile-coverage/unit-matrix.json` and `plans/unit-profile-coverage/srd-unit-inventory.json`.",
    "",
    scope.description,
    "",
    "## Metrics",
    "",
    "| Metric | Result |",
    "| --- | ---: |",
    `| Strict runtime/profile support | ${renderMetric(report.metrics.strictRuntimeProfileSupport)} |`,
    `| Strict target closure | ${renderMetric(report.metrics.strictTargetClosure)} |`,
    `| Product readiness | ${renderMetric(report.metrics.productReadiness)} |`,
    `| Rules-kernel profile join | ${renderMetric(report.metrics.rulesKernelProfileJoin)} |`,
    `| Rules-kernel covered profile join | ${renderMetric(report.metrics.rulesKernelCoveredProfileJoin)} |`,
    `| Supported Unit rules-kernel chain | ${renderMetric(report.metrics.rulesKernelSupportedUnitCoverage)} |`,
    "",
    "These metrics are lower-layer accounting views. They are not, by themselves, a valid full-support claim.",
    "",
    "## Full-Support Claim Gate",
    "",
    "| Gate | Status | Blocking issue |",
    "| --- | --- | --- |",
    `| SRD-authored character-creation catalog | ${report.srdAuthoredCharacterCreationReadiness.openBlockerCount === 0 ? "pass" : "blocked"} | ${report.srdAuthoredCharacterCreationReadiness.openBlockerCount === 0 ? "_none_" : "SRD Background family is incomplete"} |`,
    "",
    "A failed gate invalidates a full level-support claim without pretending to be a weighted completion percentage.",
    "",
    "## SRD-Authored Character Creation Catalog",
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
    "| Unit | Status | Profiles Needing Attention |",
    "| --- | --- | --- |",
    ...(report.rulesKernelSupportedUnitJoin.units.filter(
      (row) => row.joinStatus !== "covered",
    ).length === 0
      ? ["| _none_ | _none_ | _none_ |"]
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
            return `| \`${row.unitId}\` | ${row.joinStatus} | ${profiles} |`;
          })),
    "",
    "## Non-Supported Frontier Detail",
    "",
    "| Unit | Status | Claim | Catalog | Closure kinds | Reason |",
    "| --- | --- | --- | --- | --- | --- |",
    ...report.frontierRows.map(
      (row) =>
        `| \`${row.unitId}\` | ${row.status} | ${row.claimTag} | ${row.catalogStatus ?? "missing"} | ${row.closureKinds.length === 0 ? "_none_" : row.closureKinds.join(", ")} | ${md(row.reason)} |`,
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

module.exports = {
  buildLevel1FullSupport,
  buildLevel12FullSupport,
  renderLevel1FullSupport,
  renderLevel12FullSupport,
};
