const fs = require("node:fs");
const path = require("node:path");
const { fail } = require("./unit-profile-coverage-io.cjs");
const {
  battleReadinessClosureKind,
} = require("./unit-profile-coverage-config.cjs");
const { percent, stable } = require("./unit-profile-coverage-report.cjs");

const strictLevelBands = ["level-1", "spell-level-0", "spell-level-1"];
const companionWorktreeExcludedUnitIds = ["find_familiar"];
const adoptedNoMatrixSrdPressureDecisionUnitIds = new Set([
  "disguise_self",
  "druidcraft",
  "elementalism",
  "illusory_script",
]);
const strictStatusDefinitions = [
  {
    status: "supported-profile",
    strictTargetClosed: true,
    description:
      "Full support exists at the Unit profile boundary for strict level-1 accounting.",
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
    status: "closed-later-level-only",
    strictTargetClosed: true,
    description:
      "The level-1 behavior is complete and every remaining residual is later-level-only.",
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
const characterFactRuntimeDetachedSplitClosureKind =
  battleReadinessClosureKind.characterFactRuntimeDetachedSplit;
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

function buildStrictCandidateGroups(srdUnitInventory) {
  const scopedRows = srdUnitInventory.rows.filter((row) =>
    strictLevelBands.includes(row.levelBand),
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

function strictCandidateMatrixUnit(unitId, matrixUnitsById) {
  const units = matrixUnitsById.get(unitId) ?? [];
  if (units.length > 1) {
    fail(
      `Strict level-1 support candidate ${unitId} has ${units.length} Unit matrix rows.`,
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

function strictStatusDescription(status) {
  const description = strictStatusDescriptions.get(status);
  if (description === undefined) {
    fail(`Strict level-1 support status ${status} has no description.`);
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
  if (hasOnlyLaterLevelResiduals(claim)) {
    return {
      status: "closed-later-level-only",
      reason:
        closureReasonForClaim(claim) ||
        "The remaining profile subset residuals occur only after level 1.",
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

function rowForStrictUnit(unit, sourceRows) {
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
    sourceRows: sourceRowSummary(sourceRows),
  });
}

function groupRowsByStatus(rows) {
  return Array.from(
    rows
      .reduce((groups, row) => {
        const current = groups.get(row.status) ?? {
          status: row.status,
          description: strictStatusDescription(row.status),
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
    .sort(
      (a, b) => b.count - a.count || a.status.localeCompare(b.status),
    );
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

function buildLevel1FullSupport(matrix, srdUnitInventory, options = {}) {
  const candidateRowsByUnitId = buildStrictCandidateGroups(srdUnitInventory);
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

    strictRows.push(rowForStrictUnit(matrixUnit, sourceRows));
  }

  const strictRuntimeProfileSupport = strictRows.filter(
    (row) => row.status === "supported-profile",
  );
  const strictTargetClosure = strictRows.filter(
    (row) => row.strictTargetClosed,
  );
  const frontierRows = strictRows.filter(
    (row) => row.status !== "supported-profile",
  );
  const groups = groupRowsByStatus(strictRows);
  const openFrontier = groups.filter(
    (group) => !strictTargetClosureStatuses.has(group.status),
  );

  return stable({
    generatedBy: "scripts/unit-profile-coverage-check.cjs",
    sourceArtifacts: {
      unitMatrix: "plans/unit-profile-coverage/unit-matrix.json",
      srdUnitInventory:
        "plans/unit-profile-coverage/srd-unit-inventory.json",
    },
    scope: {
      levelBands: strictLevelBands,
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
      productReadiness: srdUnitInventory.metrics.levelOneBattleReadiness,
    },
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
    frontierRows: frontierRows.sort((a, b) =>
      a.unitId.localeCompare(b.unitId),
    ),
    openFrontier,
    outsideDenominator,
  });
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

function renderLevel1FullSupport(report) {
  return `${[
    "# Level 1 Full Support",
    "",
    "Generated by `scripts/unit-profile-coverage-check.cjs` from `plans/unit-profile-coverage/unit-matrix.json` and `plans/unit-profile-coverage/srd-unit-inventory.json`.",
    "",
    "This strict view tracks executable SRD level-1, cantrip, and level-1 spell pressure separately from the broader product readiness closure metric.",
    "",
    "## Metrics",
    "",
    "| Metric | Covered |",
    "| --- | ---: |",
    `| Strict runtime/profile support | ${renderMetric(report.metrics.strictRuntimeProfileSupport)} |`,
    `| Strict target closure | ${renderMetric(report.metrics.strictTargetClosure)} |`,
    `| Product readiness | ${renderMetric(report.metrics.productReadiness)} |`,
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

module.exports = {
  buildLevel1FullSupport,
  renderLevel1FullSupport,
};
