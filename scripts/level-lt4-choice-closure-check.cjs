#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = process.env.LEVEL_LT4_CHOICE_CLOSURE_ROOT ?? process.cwd();
const write = process.argv.includes("--write");
const strict = process.argv.includes("--strict");
const selfTest = process.argv.includes("--self-test");

const outputJsonPath = path.join(
  root,
  "plans/unit-profile-coverage/level-lt4-choice-closure.json",
);
const outputMarkdownPath = path.join(
  root,
  "plans/unit-profile-coverage/LEVEL_LT4_CHOICE_CLOSURE.md",
);

const fightingStyleFeats = [
  {
    admissionScope: "Fighter 1, Paladin 2, Ranger 2 Fighting Style",
    category: "fighting_style",
    name: "Archery",
    rawAnchor: ".references/srd-5.2.1/Feats.md:91-97",
    unitId: "feat_archery",
  },
  {
    admissionScope: "Fighter 1, Paladin 2, Ranger 2 Fighting Style",
    category: "fighting_style",
    name: "Defense",
    rawAnchor: ".references/srd-5.2.1/Feats.md:99-103",
    unitId: "defense",
  },
  {
    admissionScope: "Fighter 1, Paladin 2, Ranger 2 Fighting Style",
    category: "fighting_style",
    name: "Great Weapon Fighting",
    rawAnchor: ".references/srd-5.2.1/Feats.md:105-109",
    unitId: "feat_great_weapon_fighting",
  },
  {
    admissionScope: "Fighter 1, Paladin 2, Ranger 2 Fighting Style",
    category: "fighting_style",
    name: "Two-Weapon Fighting",
    rawAnchor: ".references/srd-5.2.1/Feats.md:111-115",
    unitId: "feat_two_weapon_fighting",
  },
];

const originFeats = [
  {
    admissionScope: "Human Versatile Origin feat choice",
    category: "origin",
    name: "Alert",
    rawAnchor: ".references/srd-5.2.1/Feats.md:23-31",
    unitId: "alert",
  },
  {
    admissionScope: "Human Versatile Origin feat choice",
    category: "origin",
    name: "Magic Initiate (Cleric)",
    rawAnchor: ".references/srd-5.2.1/Feats.md:33-45",
    unitId: "feat_magic_initiate_cleric",
  },
  {
    admissionScope: "Human Versatile Origin feat choice",
    category: "origin",
    name: "Magic Initiate (Druid)",
    rawAnchor: ".references/srd-5.2.1/Feats.md:33-45",
    unitId: "feat_magic_initiate_druid",
  },
  {
    admissionScope: "Human Versatile Origin feat choice",
    category: "origin",
    name: "Magic Initiate (Wizard)",
    rawAnchor: ".references/srd-5.2.1/Feats.md:33-45",
    unitId: "feat_magic_initiate_wizard",
  },
  {
    admissionScope: "Human Versatile Origin feat choice",
    category: "origin",
    name: "Savage Attacker",
    rawAnchor: ".references/srd-5.2.1/Feats.md:47-51",
    unitId: "feat_savage_attacker",
  },
  {
    admissionScope: "Human Versatile Origin feat choice",
    category: "origin",
    name: "Skilled",
    rawAnchor: ".references/srd-5.2.1/Feats.md:53-59",
    unitId: "feat_skilled",
  },
];

const srdSpecies = [
  {
    admissionScope: "Character creation species choice",
    category: "species",
    name: "Dragonborn",
    rawAnchor: ".references/srd-5.2.1/Character-Origins.md:99-127",
    unitId: "species_dragonborn",
  },
  {
    admissionScope: "Character creation species choice",
    category: "species",
    name: "Dwarf",
    rawAnchor: ".references/srd-5.2.1/Character-Origins.md:129-145",
    unitId: "species_dwarf",
  },
  {
    admissionScope: "Character creation species choice",
    category: "species",
    name: "Elf",
    rawAnchor: ".references/srd-5.2.1/Character-Origins.md:147-175",
    unitId: "species_elf",
  },
  {
    admissionScope: "Character creation species choice",
    category: "species",
    name: "Gnome",
    rawAnchor: ".references/srd-5.2.1/Character-Origins.md:177-193",
    unitId: "species_gnome",
  },
  {
    admissionScope: "Character creation species choice",
    category: "species",
    name: "Goliath",
    rawAnchor: ".references/srd-5.2.1/Character-Origins.md:194-213",
    unitId: "species_goliath",
  },
  {
    admissionScope: "Character creation species choice",
    category: "species",
    name: "Halfling",
    rawAnchor: ".references/srd-5.2.1/Character-Origins.md:215-229",
    unitId: "species_halfling",
  },
  {
    admissionScope: "Character creation species choice",
    category: "species",
    name: "Human",
    rawAnchor: ".references/srd-5.2.1/Character-Origins.md:231-243",
    unitId: "species_human",
  },
  {
    admissionScope: "Character creation species choice",
    category: "species",
    name: "Orc",
    rawAnchor: ".references/srd-5.2.1/Character-Origins.md:245-259",
    unitId: "species_orc",
  },
  {
    admissionScope: "Character creation species choice",
    category: "species",
    name: "Tiefling",
    rawAnchor: ".references/srd-5.2.1/Character-Origins.md:261-274",
    unitId: "species_tiefling",
  },
];

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function extractStringConstants(source) {
  return new Map(
    Array.from(
      source.matchAll(/const\s+([A-Z0-9_]+)\s*=\s*"([^"]+)"/g),
      ([, name, value]) => [name, value],
    ),
  );
}

function extractConstArrayBody(source, constName) {
  const pattern = new RegExp(
    `(?:export\\s+)?const\\s+${constName}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*(?:as const|satisfies|;)`,
  );
  return source.match(pattern)?.[1] ?? "";
}

function extractUnitIdsFromArray(source, constName, constants) {
  const body = extractConstArrayBody(source, constName);
  const ids = [];
  for (const match of body.matchAll(/"([^"]+)"/g)) ids.push(match[1]);
  for (const match of body.matchAll(/\b([A-Z0-9_]+)\b/g)) {
    const resolved = constants.get(match[1]);
    if (resolved !== undefined) ids.push(resolved);
  }
  return stableUnique(ids);
}

function extractCreationChoiceIdsFromArray(source, constName, constants) {
  const body = extractConstArrayBody(source, constName);
  const ids = [];
  for (const match of body.matchAll(/creationChoiceOptionId\("([^"]+)"\)/g)) {
    ids.push(match[1]);
  }
  for (const match of body.matchAll(/creationChoiceOptionId\(([A-Z0-9_]+)\)/g)) {
    const resolved = constants.get(match[1]);
    if (resolved !== undefined) ids.push(resolved);
  }
  for (const match of body.matchAll(
    /\.\.\.\s*([A-Z0-9_]+)\s*\.\s*map\(\s*creationChoiceOptionId\s*\)/g,
  )) {
    ids.push(...extractUnitIdsFromArray(source, match[1], constants));
  }
  return stableUnique(ids);
}

function stableUnique(values) {
  return Array.from(new Set(values)).sort();
}

function discoverSurfaceContentIds() {
  const contentDir = path.join(root, "packages/surface/content");
  return new Map(
    fs
      .readdirSync(contentDir)
      .filter((file) => file.endsWith(".json"))
      .flatMap((file) => {
        const fullPath = path.join(contentDir, file);
        const parsed = JSON.parse(fs.readFileSync(fullPath, "utf8"));
        return typeof parsed.id === "string"
          ? [[parsed.id, path.relative(root, fullPath)]]
          : [];
      }),
  );
}

function indexMatrixEntries() {
  const matrix = readJson("plans/unit-profile-coverage/unit-matrix.json");
  const entriesByUnitId = new Map();
  const visit = (value) => {
    if (value === null || typeof value !== "object") return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (typeof value.unitId === "string") {
      const entries = entriesByUnitId.get(value.unitId) ?? [];
      entries.push(value);
      entriesByUnitId.set(value.unitId, entries);
    }
    for (const nested of Object.values(value)) visit(nested);
  };
  visit(matrix);
  return entriesByUnitId;
}

function matrixEntryFor(entriesByUnitId, unitId) {
  const entries = entriesByUnitId.get(unitId) ?? [];
  return (
    entries.find((entry) => entry.claim !== undefined) ??
    entries.find((entry) => entry.support !== undefined) ??
    entries.find((entry) => entry.catalogAdmission !== undefined) ??
    entries.find((entry) => entry.catalogAdmissionStatus !== undefined) ??
    entries[0]
  );
}

function claimTag(entry) {
  return entry?.claim?.tag ?? entry?.support?.tag ?? "missing";
}

function closureKind(entry) {
  return (
    entry?.claim?.battleReadinessClosure?.kind ??
    entry?.claim?.deferredMechanics?.[0]?.battleReadinessClosure?.kind ??
    undefined
  );
}

function buildRow({
  category,
  expected,
  selectableIds,
  surfaceContentIds,
  entriesByUnitId,
}) {
  const matrixEntry = matrixEntryFor(entriesByUnitId, expected.unitId);
  const cataloged = surfaceContentIds.has(expected.unitId);
  const selectable = selectableIds.includes(expected.unitId);
  const blockers = [
    cataloged ? undefined : "missing-surface-catalog",
    selectable ? undefined : "missing-character-creation-admission",
  ].filter(Boolean);
  return {
    admissionScope: expected.admissionScope,
    blockers,
    cataloged,
    category,
    claimTag: claimTag(matrixEntry),
    closureKind: closureKind(matrixEntry),
    name: expected.name,
    rawAnchor: expected.rawAnchor,
    selectable,
    sourceRecordPath: surfaceContentIds.get(expected.unitId),
    unitId: expected.unitId,
  };
}

function count(rows, predicate) {
  return rows.filter(predicate).length;
}

function buildReport() {
  const phase1Manifest = readText(
    "packages/character-creation-runtime/src/phase1-manifest.ts",
  );
  const supportGates = readText(
    "packages/character-creation-runtime/src/support-gates.ts",
  );
  const phase1Constants = extractStringConstants(phase1Manifest);
  const supportConstants = extractStringConstants(supportGates);
  const surfaceContentIds = discoverSurfaceContentIds();
  const entriesByUnitId = indexMatrixEntries();
  const fightingStyleSelectableIds = extractCreationChoiceIdsFromArray(
    phase1Manifest,
    "SUPPORTED_FIGHTING_STYLE_OPTION_IDS",
    phase1Constants,
  );
  const speciesSelectableIds = extractUnitIdsFromArray(
    phase1Manifest,
    "SRD_CHARACTER_ADMISSION_SPECIES_UNIT_IDS",
    phase1Constants,
  );
  const humanOriginFeatSelectableIds = extractCreationChoiceIdsFromArray(
    supportGates,
    "SUPPORTED_HUMAN_ORIGIN_FEAT_OPTION_IDS",
    supportConstants,
  );
  const rows = [
    ...fightingStyleFeats.map((expected) =>
      buildRow({
        category: "fighting-style-feat-target",
        expected,
        selectableIds: fightingStyleSelectableIds,
        surfaceContentIds,
        entriesByUnitId,
      }),
    ),
    ...originFeats.map((expected) =>
      buildRow({
        category: "human-origin-feat-target",
        expected,
        selectableIds: humanOriginFeatSelectableIds,
        surfaceContentIds,
        entriesByUnitId,
      }),
    ),
    ...srdSpecies.map((expected) =>
      buildRow({
        category: "srd-species-target",
        expected,
        selectableIds: speciesSelectableIds,
        surfaceContentIds,
        entriesByUnitId,
      }),
    ),
  ];
  const blockers = rows.filter((row) => row.blockers.length > 0);
  return {
    schema: "level-lt4-choice-closure.v1",
    mode: strict ? "strict" : "non-strict",
    summary: {
      blockerCount: blockers.length,
      cataloged: count(rows, (row) => row.cataloged),
      selectable: count(rows, (row) => row.selectable),
      targetCount: rows.length,
    },
    notes: [
      "This gate is RAW-backed for level <4 choice targets and non-strict by default.",
      "It expands category grants that the older level reports could miss.",
      "Run with --strict only after the Ralph closure lanes land.",
    ],
    selectableSources: {
      fightingStyleSelectableIds,
      humanOriginFeatSelectableIds,
      speciesSelectableIds,
    },
    blockers,
    rows,
  };
}

function renderMarkdown(report) {
  const lines = [
    "# Level <4 Choice Closure Gate",
    "",
    "Status: generated, non-strict until the Ralph closure lanes land.",
    "",
    "## Summary",
    "",
    `- Targets: ${report.summary.targetCount}`,
    `- Cataloged: ${report.summary.cataloged}/${report.summary.targetCount}`,
    `- Character-creation selectable: ${report.summary.selectable}/${report.summary.targetCount}`,
    `- Current blockers: ${report.summary.blockerCount}`,
    "",
    "## Current Blockers",
    "",
  ];
  if (report.blockers.length === 0) {
    lines.push("None.");
  } else {
    lines.push(
      "| Unit | Domain | Missing | RAW anchor |",
      "| --- | --- | --- | --- |",
    );
    for (const row of report.blockers) {
      lines.push(
        `| \`${row.unitId}\` | ${row.category} | ${row.blockers.join(", ")} | ${row.rawAnchor} |`,
      );
    }
  }
  lines.push(
    "",
    "## Target Rows",
    "",
    "| Unit | Domain | Cataloged | Selectable | Claim | Closure | RAW anchor |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  );
  for (const row of report.rows) {
    lines.push(
      `| \`${row.unitId}\` | ${row.category} | ${yesNo(row.cataloged)} | ${yesNo(row.selectable)} | ${row.claimTag} | ${row.closureKind ?? ""} | ${row.rawAnchor} |`,
    );
  }
  lines.push(
    "",
    "## Verification",
    "",
    "- RAW/ubiquitous-language check: compare every row to `.references/srd-5.2.1/Feats.md`, `.references/srd-5.2.1/Character-Origins.md`, and `UBIQUITOUS_LANGUAGE.md` before implementing rules.",
    "- Reviewer-loop convergence: after implementation, run RAW traceability, ubiquitous-language/domain, architecture/connascence, and code-review passes until no reasonable findings remain.",
    "- Non-strict check: `pnpm level-lt4-choice-closure:check`.",
    "- Regenerate: `pnpm level-lt4-choice-closure:check -- --write`.",
    "- Strict activation after closure lanes: `pnpm level-lt4-choice-closure:check -- --strict`.",
    "",
  );
  return `${lines.join("\n")}\n`;
}

function yesNo(value) {
  return value ? "yes" : "no";
}

function writeOrCompare(filePath, content) {
  if (write) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
    return [];
  }
  if (!fs.existsSync(filePath)) return [`missing generated file ${filePath}`];
  const actual = fs.readFileSync(filePath, "utf8");
  return actual === content ? [] : [`stale generated file ${filePath}`];
}

function runSelfTest() {
  const source = `
    const FIRST = "alpha";
    export const VALUES = [
      FIRST,
      "beta",
    ] as const satisfies ReadonlyArray<string>;
    const CHOICE_UNITS = [
      "delta",
      "epsilon",
    ] as const;
    const CHOICES = [
      creationChoiceOptionId(FIRST),
      creationChoiceOptionId("gamma"),
      ...CHOICE_UNITS.map(creationChoiceOptionId),
    ] as const;
  `;
  const constants = extractStringConstants(source);
  const values = extractUnitIdsFromArray(source, "VALUES", constants);
  const choices = extractCreationChoiceIdsFromArray(source, "CHOICES", constants);
  const issues = [];
  if (values.join(",") !== "alpha,beta") {
    issues.push(`expected VALUES alpha,beta; received ${values.join(",")}`);
  }
  if (choices.join(",") !== "alpha,delta,epsilon,gamma") {
    issues.push(
      `expected CHOICES alpha,delta,epsilon,gamma; received ${choices.join(",")}`,
    );
  }
  return issues;
}

function main() {
  if (selfTest) {
    const issues = runSelfTest();
    for (const issue of issues)
      console.error(`level-lt4-choice-closure: ${issue}`);
    process.exitCode = issues.length > 0 ? 1 : 0;
    return;
  }
  const report = buildReport();
  const json = `${JSON.stringify(report, null, 2)}\n`;
  const markdown = renderMarkdown(report);
  const issues = [
    ...writeOrCompare(outputJsonPath, json),
    ...writeOrCompare(outputMarkdownPath, markdown),
  ];
  if (strict && report.blockers.length > 0) {
    issues.push(
      `strict level <4 choice closure has ${report.blockers.length} blocker(s).`,
    );
  }
  for (const issue of issues)
    console.error(`level-lt4-choice-closure: ${issue}`);
  process.exitCode = issues.length > 0 ? 1 : 0;
}

main();
