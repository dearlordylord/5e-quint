const { characterLevelBands } = require("./level1-full-support-report.cjs");
const { stable } = require("./unit-profile-coverage-report.cjs");

const maxAuditCharacterLevel = 7;
const levelOneSevenMiningAuditLevelBands = characterLevelBands(
  maxAuditCharacterLevel,
);
const levelOneSevenMiningAuditLevelBandSet = new Set(
  levelOneSevenMiningAuditLevelBands,
);

function countValues(values) {
  return Object.fromEntries(
    Array.from(
      values.reduce((groups, value) => {
        groups.set(value, (groups.get(value) ?? 0) + 1);
        return groups;
      }, new Map()),
    ).sort(([left], [right]) => String(left).localeCompare(String(right))),
  );
}

function countByLevelBand(rows) {
  const counts = new Map(
    levelOneSevenMiningAuditLevelBands.map((band) => [band, 0]),
  );
  for (const row of rows) {
    counts.set(row.levelBand, (counts.get(row.levelBand) ?? 0) + 1);
  }
  return Object.fromEntries(counts);
}

function auditAxis(levelBand) {
  return levelBand.startsWith("spell-level-")
    ? "spell-level"
    : "character-level";
}

function sourceRef(source) {
  return `${source.path}:${source.lineStart}`;
}

function unitProfileSnapshot(unitProfileDisposition) {
  return unitProfileDisposition === undefined
    ? { state: "not-recorded" }
    : { state: "recorded", disposition: unitProfileDisposition };
}

function battleReadinessSnapshot(battleReadinessStatus) {
  return battleReadinessStatus === undefined
    ? { state: "not-applicable" }
    : { state: "recorded", status: battleReadinessStatus };
}

function projectAuditRow(row) {
  return {
    rowId: row.id,
    levelBand: row.levelBand,
    axis: auditAxis(row.levelBand),
    rowKind: row.rowKind,
    category: row.category,
    className: row.className,
    concept: row.concept,
    candidateUnitId: row.candidateUnitId,
    source: row.source,
    minedDenominator: {
      state: "present",
      sourceInventory: "plans/unit-profile-coverage/srd-unit-inventory.json",
      sourceInventoryRowId: row.id,
    },
    supportSnapshot: {
      authoredContent: { state: row.authoredContent.state },
      catalogAdmission: { state: row.catalogAdmission.state },
      unitProfile: unitProfileSnapshot(row.unitProfileDisposition),
      finalDisposition: row.finalDisposition,
      battleReadiness: battleReadinessSnapshot(row.battleReadinessStatus),
    },
    nextAction: row.nextAction,
  };
}

function unitProfileSnapshotLabel(unitProfile) {
  return unitProfile.state === "recorded"
    ? unitProfile.disposition
    : unitProfile.state;
}

function battleReadinessSnapshotLabel(battleReadiness) {
  return battleReadiness.state === "recorded"
    ? battleReadiness.status
    : battleReadiness.state;
}

function buildLevelOneSevenMiningAudit(srdUnitInventory) {
  const rows = srdUnitInventory.rows
    .filter((row) => levelOneSevenMiningAuditLevelBandSet.has(row.levelBand))
    .map(projectAuditRow)
    .sort((left, right) => left.rowId.localeCompare(right.rowId));
  const rowsByLevelBand = countByLevelBand(rows);
  const missingMinedLevelBands = levelOneSevenMiningAuditLevelBands.filter(
    (levelBand) => rowsByLevelBand[levelBand] === 0,
  );
  return stable({
    generatedBy: "scripts/unit-profile-coverage-check.cjs",
    sourceArtifacts: {
      srdUnitInventory: "plans/unit-profile-coverage/srd-unit-inventory.json",
    },
    sourceAnchors: [
      ".references/srd-5.2.1/Classes/*.md",
      ".references/srd-5.2.1/Spells/*.md",
    ],
    scope: {
      title: "Character Levels 1-7 Mining Audit",
      maxCharacterLevel: maxAuditCharacterLevel,
      levelBands: levelOneSevenMiningAuditLevelBands,
      denominatorRule:
        "A row enters this audit only when a mined SRD inventory row exists for an included character-level or spell-level band.",
      supportGate:
        "non-blocking mining frontier; runtime admission and support snapshots are reported but do not pass or fail level 1-4 full-support gates",
      axisRule:
        "Character level and spell level are separate axes. Character level 5 opens spell-level-3 pressure for full casters; character level 7 opens spell-level-4 pressure for full casters.",
    },
    metrics: {
      minedDenominatorRows: rows.length,
      rowsByLevelBand,
      missingMinedLevelBands,
      rowsByAxis: countValues(rows.map((row) => row.axis)),
      rowsByRowKind: countValues(rows.map((row) => row.rowKind)),
      rowsByCategory: countValues(rows.map((row) => row.category)),
      rowsByFinalDisposition: countValues(
        rows.map((row) => row.supportSnapshot.finalDisposition),
      ),
      rowsByCatalogAdmission: countValues(
        rows.map((row) => row.supportSnapshot.catalogAdmission.state),
      ),
      rowsByUnitProfileDisposition: countValues(
        rows.map((row) =>
          unitProfileSnapshotLabel(row.supportSnapshot.unitProfile),
        ),
      ),
      rowsByBattleReadinessStatus: countValues(
        rows.map((row) =>
          battleReadinessSnapshotLabel(row.supportSnapshot.battleReadiness),
        ),
      ),
    },
    rows,
  });
}

function md(value) {
  return String(value ?? "")
    .replace(/\n/g, " ")
    .replace(/\|/g, "\\|");
}

function renderKeyCountRows(counts) {
  const entries = Object.entries(counts);
  if (entries.length === 0) return ["| _none_ | 0 |"];
  return entries.map(([key, count]) => `| ${md(key)} | ${count} |`);
}

function renderLevelBandRows(rowsByLevelBand) {
  return levelOneSevenMiningAuditLevelBands.map((levelBand) => {
    const rowCount = rowsByLevelBand[levelBand] ?? 0;
    return `| ${levelBand} | ${auditAxis(levelBand)} | ${rowCount > 0 ? "present" : "not-yet-mined"} | ${rowCount} |`;
  });
}

function renderMissingBands(missingMinedLevelBands) {
  if (missingMinedLevelBands.length === 0) return "_none_";
  return missingMinedLevelBands
    .map((levelBand) => `\`${levelBand}\``)
    .join(", ");
}

function renderLevelOneSevenMiningAudit(report) {
  return `${[
    "# Character Levels 1-7 Mining Audit",
    "",
    "Generated by `scripts/unit-profile-coverage-check.cjs` from `plans/unit-profile-coverage/srd-unit-inventory.json`.",
    "",
    "**This is a mining/audit frontier, not a full-support claim.** A `present` row means the SRD source row exists in the mined denominator. Runtime support, catalog admission, and battle-readiness columns are non-blocking snapshots and do not pass or fail the current level 1-4 gates.",
    "",
    "Character level and spell level are separate axes. Character level 5 opens spell-level-3 pressure for full casters; character level 7 opens spell-level-4 pressure for full casters.",
    "",
    "## Scope",
    "",
    "| Scope fact | Value |",
    "| --- | --- |",
    `| Maximum character level | ${report.scope.maxCharacterLevel} |`,
    `| Included level bands | ${report.scope.levelBands.map((levelBand) => `\`${levelBand}\``).join(", ")} |`,
    `| Denominator rule | ${md(report.scope.denominatorRule)} |`,
    `| Gate behavior | ${md(report.scope.supportGate)} |`,
    `| Missing mined bands | ${renderMissingBands(report.metrics.missingMinedLevelBands)} |`,
    "",
    "## Mining Row Presence",
    "",
    "| Level band | Axis | Mining state | Rows |",
    "| --- | --- | --- | ---: |",
    ...renderLevelBandRows(report.metrics.rowsByLevelBand),
    "",
    "## Non-Blocking Runtime Snapshot",
    "",
    "These counts describe the current runtime/catalog state of mined rows. They are deliberately outside the full-support claim gate.",
    "",
    "### Final Disposition",
    "",
    "| Disposition | Rows |",
    "| --- | ---: |",
    ...renderKeyCountRows(report.metrics.rowsByFinalDisposition),
    "",
    "### Catalog Admission",
    "",
    "| Catalog state | Rows |",
    "| --- | ---: |",
    ...renderKeyCountRows(report.metrics.rowsByCatalogAdmission),
    "",
    "### Unit Profile Disposition",
    "",
    "| Unit profile disposition | Rows |",
    "| --- | ---: |",
    ...renderKeyCountRows(report.metrics.rowsByUnitProfileDisposition),
    "",
    "### Battle Readiness Snapshot",
    "",
    "| Battle readiness status | Rows |",
    "| --- | ---: |",
    ...renderKeyCountRows(report.metrics.rowsByBattleReadinessStatus),
    "",
    "## Mined Rows",
    "",
    "| Row | Level band | Axis | Category | Unit | Source | Mined denominator | Catalog | Unit profile | Final disposition | Battle readiness | Next action |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...report.rows.map((row) => {
      const cells = [
        row.concept,
        row.levelBand,
        row.axis,
        row.category,
        `\`${row.candidateUnitId}\``,
        `\`${sourceRef(row.source)}\``,
        row.minedDenominator.state,
        row.supportSnapshot.catalogAdmission.state,
        unitProfileSnapshotLabel(row.supportSnapshot.unitProfile),
        row.supportSnapshot.finalDisposition,
        battleReadinessSnapshotLabel(row.supportSnapshot.battleReadiness),
        row.nextAction,
      ];
      return `| ${cells.map(md).join(" | ")} |`;
    }),
    "",
  ].join("\n")}`;
}

module.exports = {
  buildLevelOneSevenMiningAudit,
  levelOneSevenMiningAuditLevelBands,
  renderLevelOneSevenMiningAudit,
};
