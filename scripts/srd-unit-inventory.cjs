const fs = require("node:fs");
const path = require("node:path");

const classDir = ".references/srd-5.2.1/Classes";
const classOrder = [
  "Barbarian",
  "Bard",
  "Cleric",
  "Druid",
  "Fighter",
  "Monk",
  "Paladin",
  "Ranger",
  "Rogue",
  "Sorcerer",
  "Warlock",
  "Wizard",
];

const nonRuntimeKinds = new Set([
  "class-narrative",
  "class-table-summary",
]);

const exactSurfaceKinds = new Set([
  "class-container",
  "core-trait",
  "multiclass-entry",
  "class-feature-grant",
  "spell-access",
  "spell-unit-pressure",
  "equipment-pressure",
]);

function slug(text) {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function readLines(root, relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8").split(/\r?\n/);
}

function sectionRange(lines, headingLine) {
  const heading = lines[headingLine - 1] ?? "";
  const depth = heading.match(/^(#+)\s/)?.[1].length ?? 1;
  let end = lines.length;
  for (let index = headingLine; index < lines.length; index += 1) {
    const match = lines[index].match(/^(#+)\s/);
    if (match && match[1].length <= depth) {
      end = index;
      break;
    }
  }
  return { startLine: headingLine, endLine: end };
}

function headingLine(lines, pattern) {
  const index = lines.findIndex((line) => pattern.test(line));
  return index === -1 ? undefined : index + 1;
}

function tableRows(lines, headingPattern) {
  const start = headingLine(lines, headingPattern);
  if (start === undefined) return [];
  const rows = [];
  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index];
    if (index > start && /^#{1,6}\s/.test(line)) break;
    if (!line.startsWith("|")) continue;
    if (/^\|\s*-+/.test(line)) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length > 0) rows.push({ line: index + 1, cells });
  }
  return rows;
}

function firstLevelRow(lines, className) {
  const rows = tableRows(lines, new RegExp(`^### ${className} Features$|^## ${className} Features$`));
  const header = rows[0]?.cells ?? [];
  const row = rows.find((entry) => entry.cells[0] === "1");
  return row ? { header, row } : undefined;
}

function levelOneFeatureHeadings(lines) {
  return lines
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter((entry) => /^### Level 1: /.test(entry.line))
    .map((entry) => ({
      name: entry.line.replace(/^### Level 1: /, "").trim(),
      lineNumber: entry.lineNumber,
    }));
}

function spellListEntries(lines, className, spellLevel) {
  const title =
    spellLevel === 0
      ? /^### Cantrips \(Level 0 .* Spells\)$/
      : new RegExp(`^### Level ${spellLevel} ${className} Spells$`);
  return tableRows(lines, title)
    .slice(1)
    .map((entry) => ({
      lineNumber: entry.line,
      name: entry.cells[0]?.replace(/\*/g, "") ?? "",
      spellLevel,
      school: entry.cells[1],
      special: entry.cells[2],
    }))
    .filter((entry) => entry.name.length > 0);
}

function findAuthored(root) {
  const contentDir = path.join(root, "packages/surface/content");
  return new Map(
    fs
      .readdirSync(contentDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => {
        const relativePath = `packages/surface/content/${entry.name}`;
        const record = JSON.parse(
          fs.readFileSync(path.join(root, relativePath), "utf8"),
        );
        return [
          record.id,
          {
            unitId: record.id,
            kind: record.kind,
            sourceRecordPath: relativePath,
            provenance: record.provenance,
            executableMechanics: Boolean(record.mechanics),
          },
        ];
      }),
  );
}

function sourceReference(sourcePath, startLine, endLine = startLine) {
  return {
    path: sourcePath,
    lineStart: startLine,
    lineEnd: endLine,
  };
}

function classifyFeature(name) {
  if (name === "Spellcasting") return "spell-access";
  if (name === "Weapon Mastery") return "mastery-pressure";
  return "class-feature";
}

function rowCategory(rowKind) {
  const categories = {
    "class-container": "class container",
    "class-narrative": "fluff/non-runtime text",
    "class-table-summary": "character-creation or progression mechanic",
    "core-trait": "character-creation or progression mechanic",
    "multiclass-entry": "character-creation or progression mechanic",
    "class-feature-grant": "class feature",
    "spell-access": "spell access/list pressure",
    "spell-unit-pressure": "spell Unit pressure",
    "equipment-pressure": "equipment/weapon/armor pressure",
    "mastery-pressure": "mastery pressure",
  };
  return categories[rowKind] ?? "unsupported/out of promoted scope";
}

function surfaceGate(row) {
  if (nonRuntimeKinds.has(row.rowKind)) {
    return {
      state: "outside-surface-runtime-mechanics",
      missingConstruct: undefined,
    };
  }
  if (exactSurfaceKinds.has(row.rowKind)) {
    return {
      state: "current-surface-can-express-source-facts",
      missingConstruct: undefined,
    };
  }
  if (row.rowKind === "mastery-pressure") {
    return {
      state: "current-surface-can-express-source-facts",
      missingConstruct: undefined,
    };
  }
  return {
    state: "current-surface-cannot-express-mechanics-yet",
    missingConstruct: `missing ${row.rowKind} Surface construct`,
  };
}

function finalDisposition(row, authored, installedIds) {
  if (nonRuntimeKinds.has(row.rowKind)) return "non-runtime";
  if (!row.candidateUnitId) return "needs-surface-widening";
  if (!authored.has(row.candidateUnitId)) return "missing-authored-record";
  if (!installedIds.has(row.candidateUnitId)) return "catalog-only/dead-for-now";
  return "supported";
}

function nextAction(row, disposition, gate) {
  if (disposition === "supported") return "Keep row in generated denominator and preserve owner evidence.";
  if (disposition === "non-runtime") return "No runtime work; keep classification as explicit closure.";
  if (disposition === "catalog-only/dead-for-now") return "Decide whether to admit/support, or keep catalog-only closure counted.";
  if (disposition === "missing-authored-record") return "Author an SRD-provenance Surface record or explicitly close the row.";
  if (disposition === "needs-surface-widening") return `Widen Surface: ${gate.missingConstruct}.`;
  return "Classify owner-specific evidence before implementation.";
}

function makeRow(input) {
  return {
    id: `srd521:${input.sourcePath.replace(/^\.references\/srd-5\.2\.1\//, "").replace(/\.md$/, "").toLowerCase()}:${input.levelBand}:${input.rowKind}:${slug(input.concept)}`,
    source: sourceReference(input.sourcePath, input.lineStart, input.lineEnd),
    className: input.className,
    levelBand: input.levelBand,
    rowKind: input.rowKind,
    category: rowCategory(input.rowKind),
    concept: input.concept,
    detail: input.detail,
    candidateUnitId: input.candidateUnitId,
  };
}

function classRows(root, className) {
  const sourcePath = `${classDir}/${className}.md`;
  const lines = readLines(root, sourcePath);
  const classSlug = slug(className);
  const rows = [];
  const coreLine = headingLine(lines, /^## Core .* Traits$/);
  const becomingLine = headingLine(lines, /^## Becoming a /);
  const featureTable = firstLevelRow(lines, className);

  rows.push(
    makeRow({
      sourcePath,
      className,
      levelBand: "level-1",
      rowKind: "class-container",
      concept: `${className} class container`,
      detail: "SRD class identity, core traits, level-1 feature grants, and class progression entry.",
      lineStart: coreLine ?? 1,
      lineEnd: becomingLine ? sectionRange(lines, becomingLine).endLine : coreLine,
      candidateUnitId: `class_${classSlug}`,
    }),
  );

  for (const entry of tableRows(lines, /^## Core .* Traits$/).slice(1)) {
    const trait = entry.cells[0].replace(/\*/g, "");
    const rowKind = trait === "Starting Equipment" ? "equipment-pressure" : "core-trait";
    rows.push(
      makeRow({
        sourcePath,
        className,
        levelBand: "level-1",
        rowKind,
        concept: `${className} ${trait}`,
        detail: entry.cells[1],
        lineStart: entry.line,
        candidateUnitId: `class_${classSlug}`,
      }),
    );
  }

  const multiclassLine = headingLine(lines, /^### As a Multiclass Character$/);
  if (multiclassLine !== undefined) {
    rows.push(
      makeRow({
        sourcePath,
        className,
        levelBand: "level-1",
        rowKind: "multiclass-entry",
        concept: `${className} multiclass entry traits`,
        detail: "Multiclass entry grants listed under the class's level-1 onboarding section.",
        lineStart: multiclassLine,
        lineEnd: sectionRange(lines, multiclassLine).endLine,
        candidateUnitId: `class_${classSlug}`,
      }),
    );
  }

  if (featureTable) {
    rows.push(
      makeRow({
        sourcePath,
        className,
        levelBand: "level-1",
        rowKind: "class-table-summary",
        concept: `${className} level 1 feature table row`,
        detail: featureTable.row.cells.join(" | "),
        lineStart: featureTable.row.line,
        candidateUnitId: `class_${classSlug}`,
      }),
    );
  }

  for (const feature of levelOneFeatureHeadings(lines)) {
    const featureKind = classifyFeature(feature.name);
    const candidateUnitId =
      feature.name === "Spellcasting" ? `class_${classSlug}` : `${classSlug}_${slug(feature.name)}`;
    rows.push(
      makeRow({
        sourcePath,
        className,
        levelBand: "level-1",
        rowKind: featureKind === "class-feature" ? "class-feature-grant" : featureKind,
        concept: `${className} ${feature.name}`,
        detail: "Level 1 class feature.",
        lineStart: feature.lineNumber,
        lineEnd: sectionRange(lines, feature.lineNumber).endLine,
        candidateUnitId,
      }),
    );
  }

  for (const spell of [
    ...spellListEntries(lines, className, 0),
    ...spellListEntries(lines, className, 1),
  ]) {
    rows.push(
      makeRow({
        sourcePath,
        className,
        levelBand: spell.spellLevel === 0 ? "spell-level-0" : "spell-level-1",
        rowKind: "spell-unit-pressure",
        concept: `${className} spell list ${spell.name}`,
        detail: `${spell.name} (${spell.school}; ${spell.special})`,
        lineStart: spell.lineNumber,
        candidateUnitId: slug(spell.name),
      }),
    );
  }

  return rows;
}

function withState(rows, authored, installedIds) {
  return rows.map((row) => {
    const authoredUnit = row.candidateUnitId
      ? authored.get(row.candidateUnitId)
      : undefined;
    const gate = surfaceGate(row);
    const disposition = finalDisposition(row, authored, installedIds);
    return {
      ...row,
      surface: gate,
      authoredContent: authoredUnit
        ? {
            state: "authored-record-present",
            unitId: authoredUnit.unitId,
            sourceRecordPath: authoredUnit.sourceRecordPath,
          }
        : { state: "missing-authored-record" },
      catalogAdmission: row.candidateUnitId
        ? installedIds.has(row.candidateUnitId)
          ? { state: "installed", unitId: row.candidateUnitId }
          : { state: "not-installed", unitId: row.candidateUnitId }
        : { state: "not-applicable" },
      finalDisposition: disposition,
      ownerEvidence:
        disposition === "supported"
          ? [
              {
                owner: "Unit catalog/admission",
                evidence: `candidate Unit ${row.candidateUnitId} is installed in srdUnitCollection`,
              },
            ]
          : [],
      nextAction: nextAction(row, disposition, gate),
    };
  });
}

function countBy(rows, key) {
  return rows.reduce((counts, row) => {
    const value = row[key];
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function buildSrdUnitInventory({ root, inventory }) {
  const authored = findAuthored(root);
  const installedIds = new Set(
    inventory
      .filter((unit) => unit.collectionId === "srd-5.2.1")
      .map((unit) => unit.unitId),
  );
  const rows = withState(
    classOrder.flatMap((className) => classRows(root, className)),
    authored,
    installedIds,
  ).sort((a, b) => a.id.localeCompare(b.id));
  const levelOneRows = rows.filter((row) => row.levelBand === "level-1");
  const spellPressureRows = rows.filter(
    (row) => row.levelBand === "spell-level-0" || row.levelBand === "spell-level-1",
  );
  return {
    generatedBy: "scripts/unit-profile-coverage-check.cjs",
    sourceCorpus: ".references/srd-5.2.1/Classes",
    scope:
      "SRD 5.2.1 class-derived Unit/catalog backlog rows, prioritized around level 1 plus level-1 spell-list pressure.",
    metrics: {
      totalRows: rows.length,
      levelOneRows: levelOneRows.length,
      spellPressureRows: spellPressureRows.length,
      levelOneClassContainers: levelOneRows.filter(
        (row) => row.rowKind === "class-container",
      ).length,
      levelOneRowsByDisposition: countBy(levelOneRows, "finalDisposition"),
      allRowsByDisposition: countBy(rows, "finalDisposition"),
      spellPressureRowsByDisposition: countBy(
        spellPressureRows,
        "finalDisposition",
      ),
      levelOneRowsByCategory: countBy(levelOneRows, "category"),
      missingClassContainers: levelOneRows.filter(
        (row) =>
          row.rowKind === "class-container" &&
          row.catalogAdmission.state !== "installed",
      ).length,
    },
    rows,
  };
}

function validateSrdUnitInventory(report) {
  const issues = [];
  const seen = new Set();
  for (const row of report.rows) {
    if (seen.has(row.id)) issues.push(`Duplicate SRD inventory row id ${row.id}.`);
    seen.add(row.id);
    if (!row.category) issues.push(`${row.id} is unclassified.`);
    if (!row.finalDisposition) issues.push(`${row.id} lacks finalDisposition.`);
    if (
      row.finalDisposition === "needs-surface-widening" &&
      !row.surface.missingConstruct
    ) {
      issues.push(`${row.id} needs Surface widening but lacks missingConstruct.`);
    }
    if (row.finalDisposition === "supported" && row.ownerEvidence.length === 0) {
      issues.push(`${row.id} is supported but lacks owner evidence.`);
    }
  }
  return issues;
}

function renderSrdUnitInventory(report) {
  const levelOne = report.rows.filter((row) => row.levelBand === "level-1");
  const missingClassContainers = levelOne
    .filter(
      (row) =>
        row.rowKind === "class-container" &&
        row.catalogAdmission.state !== "installed",
    )
    .map((row) => row.concept.replace(/ class container$/, ""));
  const lines = [
    "# SRD Unit Inventory",
    "",
    "Generated by `scripts/unit-profile-coverage-check.cjs`. Source corpus: `.references/srd-5.2.1/Classes/`.",
    "",
    "This is a Unit/catalog backlog denominator, not RAW span coverage and not an MBT queue.",
    "",
    "## Metrics",
    "",
    `- Total generated rows: ${report.metrics.totalRows}`,
    `- Level-1 rows: ${report.metrics.levelOneRows}`,
    `- Spell-list pressure rows for cantrips and level-1 spells: ${report.metrics.spellPressureRows}`,
    `- Missing level-1 class containers: ${report.metrics.missingClassContainers} (${missingClassContainers.join(", ")})`,
    "",
    "### Level-1 Rows by Disposition",
    "",
    ...Object.entries(report.metrics.levelOneRowsByDisposition)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => `- ${key}: ${count}`),
    "",
    "### Level-1 Rows by Category",
    "",
    ...Object.entries(report.metrics.levelOneRowsByCategory)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => `- ${key}: ${count}`),
    "",
    "### Spell Unit Pressure by Disposition",
    "",
    ...Object.entries(report.metrics.spellPressureRowsByDisposition)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => `- ${key}: ${count}`),
    "",
    "## Level-1 Backlog Rows",
    "",
    "| Row | Category | Surface | Authored | Catalog | Disposition | Next action | Source |",
    "|---|---|---|---|---|---|---|---|",
    ...levelOne.map((row) =>
      [
        row.concept,
        row.category,
        row.surface.state,
        row.authoredContent.state,
        row.catalogAdmission.state,
        row.finalDisposition,
        row.nextAction,
        `${row.source.path}:${row.source.lineStart}`,
      ]
        .map((cell) => String(cell).replace(/\|/g, "\\|"))
        .join("|")
        .replace(/^/, "|")
        .replace(/$/, "|"),
    ),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

module.exports = {
  buildSrdUnitInventory,
  renderSrdUnitInventory,
  validateSrdUnitInventory,
};
