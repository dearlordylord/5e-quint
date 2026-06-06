const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const markdownDir = path.join(root, ".references/srd-5.2.1/Spells");
const open5ePath = path.join(
  root,
  ".references/inspirations/open5e-api/data/v2/wizards-of-the-coast/srd-2024/Spell.json",
);
const fiveToolsPath = path.join(
  root,
  ".references/5etools-src/data/spells/spells-xphb.json",
);
const pdfTextPath = path.join("/tmp/dnd-srd-audit/srd521.txt");
const reportDir = path.join(root, "plans/srd-corpus-audit");
const jsonReportPath = path.join(reportDir, "spell-markdown-audit.json");
const mdReportPath = path.join(reportDir, "spell-markdown-audit.md");

const lowLevelMaxSpellLevel = 2;
const materialSimilarityThreshold = 0.995;
const manualReviewByName = new Map([
  [
    "Acid Arrow",
    {
      disposition: "real-markdown-corruption",
      evidence:
        "PDF text around lines 6476-6486 includes immediate 4d4 Acid damage and later 2d4 Acid damage; markdown omits the later 2d4 phrase from the hit sentence.",
    },
  ],
  [
    "Augury",
    {
      disposition: "table-title-rendering-only",
      evidence:
        "PDF text around lines 6761-6779 uses an Omens table; markdown keeps the same table as a heading plus markdown table.",
    },
  ],
  [
    "Enlarge/Reduce",
    {
      disposition: "real-markdown-corruption",
      evidence:
        "PDF text around lines 7919-7925 includes the parenthetical '(see the chosen effect below)'; markdown omits it.",
    },
  ],
  [
    "Levitate",
    {
      disposition: "real-markdown-corruption",
      evidence:
        "PDF text around lines 9128-9130 says the target is one creature or loose object that you can see within range; markdown omits 'within range' from that sentence.",
    },
  ],
]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeText(text) {
  return text
    .replace(/\{@(?:damage|scaledamage) ([^}|;]+)(?:[^}]*)\}/g, "$1")
    .replace(/\{@[^ ]+ ([^}|]+)(?:\|[^}]*)?\}/g, "$1")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—−]/g, "-")
    .replace(/\*\*\*?/g, "")
    .replace(/\*/g, "")
    .replace(/__+/g, "")
    .replace(/_/g, "")
    .replace(/`/g, "")
    .replace(/\[(.*?)\]\([^)]*\)/g, "$1")
    .replace(/#+\s*/g, "")
    .replace(/\|/g, " ")
    .replace(/[-:;,.!?()[\]"]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function words(text) {
  return normalizeText(text)
    .split(" ")
    .filter((word) => word.length > 0);
}

function lcsLength(left, right) {
  const previous = new Array(right.length + 1).fill(0);
  const current = new Array(right.length + 1).fill(0);

  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      current[j] =
        left[i - 1] === right[j - 1]
          ? previous[j - 1] + 1
          : Math.max(previous[j], current[j - 1]);
    }
    for (let j = 0; j < current.length; j += 1) {
      previous[j] = current[j];
      current[j] = 0;
    }
  }

  return previous[right.length];
}

function similarity(reference, candidate) {
  const referenceWords = words(reference);
  const candidateWords = words(candidate);
  if (referenceWords.length === 0) {
    return 1;
  }
  return lcsLength(referenceWords, candidateWords) / referenceWords.length;
}

function candidateCoverage(reference, candidate) {
  const referenceWords = words(reference);
  const candidateWords = words(candidate);
  if (candidateWords.length === 0) {
    return 1;
  }
  return lcsLength(referenceWords, candidateWords) / candidateWords.length;
}

function missingReferenceWords(reference, candidate) {
  const counts = new Map();
  for (const word of words(candidate)) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  const missing = [];
  for (const word of words(reference)) {
    const count = counts.get(word) ?? 0;
    if (count === 0) {
      missing.push(word);
    } else {
      counts.set(word, count - 1);
    }
  }
  return [...new Set(missing)].slice(0, 24);
}

function extraCandidateWords(reference, candidate) {
  const counts = new Map();
  for (const word of words(reference)) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  const extra = [];
  for (const word of words(candidate)) {
    const count = counts.get(word) ?? 0;
    if (count === 0) {
      extra.push(word);
    } else {
      counts.set(word, count - 1);
    }
  }
  return [...new Set(extra)]
    .filter(
      (word) =>
        ![
          "level",
          "casting",
          "time",
          "range",
          "components",
          "duration",
          "v",
          "s",
          "m",
          "action",
          "reaction",
          "bonus",
          "concentration",
          "up",
          "to",
          "minute",
          "minutes",
          "hour",
          "hours",
          "instantaneous",
          "self",
          "touch",
          "feet",
          "foot",
          "wizard",
          "bard",
          "using",
          "higher",
          "spell",
          "slot",
          "cantrip",
          "upgrade",
          "cleric",
          "druid",
          "paladin",
          "ranger",
          "rogue",
          "sorcerer",
          "warlock",
        ].includes(word),
    )
    .slice(0, 24);
}

function parseMarkdownSpells() {
  const files = fs
    .readdirSync(markdownDir)
    .filter((file) => file.startsWith("Descriptions-") && file.endsWith(".md"))
    .sort();
  const spells = [];

  for (const file of files) {
    const sourcePath = path.join(markdownDir, file);
    const raw = fs.readFileSync(sourcePath, "utf8");
    const headingPattern = /^## (.+)$/gm;
    const headings = [...raw.matchAll(headingPattern)];

    for (let index = 0; index < headings.length; index += 1) {
      const heading = headings[index];
      const next = headings[index + 1];
      const start = heading.index;
      const end = next ? next.index : raw.length;
      const section = raw.slice(start, end).trim();
      const before = raw.slice(0, start);
      const line = before.split("\n").length;
      const level = parseSpellLevel(section);
      spells.push({
        name: heading[1].trim(),
        level,
        file: `.references/srd-5.2.1/Spells/${file}`,
        line,
        section,
      });
    }
  }

  return spells;
}

function parseSpellLevel(section) {
  const cantrip = section.match(/^\*([^*\n]*Cantrip[^*\n]*)\*/im);
  if (cantrip) {
    return 0;
  }
  const level = section.match(/^\*Level\s+(\d+)\b/im);
  return level ? Number(level[1]) : undefined;
}

function markdownRulesText(section) {
  const lines = section.split("\n");
  const durationLine = lines.findIndex((line) =>
    /^\*\*Duration:\*\*/.test(line.trim()),
  );
  if (durationLine === -1) {
    return section;
  }
  return lines
    .slice(durationLine + 1)
    .filter((line) => line.trim() !== "---")
    .join("\n")
    .trim();
}

function open5eText(fields) {
  return [fields.desc, fields.higher_level].filter(Boolean).join(" ");
}

function renderFiveToolsEntry(entry) {
  if (typeof entry === "string") {
    return entry;
  }
  if (Array.isArray(entry)) {
    return entry.map(renderFiveToolsEntry).join(" ");
  }
  if (!entry || typeof entry !== "object") {
    return "";
  }

  const name = entry.name ? `${entry.name}. ` : "";
  if (Array.isArray(entry.entries)) {
    return `${name}${entry.entries.map(renderFiveToolsEntry).join(" ")}`;
  }
  if (Array.isArray(entry.items)) {
    return `${name}${entry.items.map(renderFiveToolsEntry).join(" ")}`;
  }
  if (entry.entry) {
    return `${name}${renderFiveToolsEntry(entry.entry)}`;
  }
  return name.trim();
}

function fiveToolsText(spell) {
  return [spell.entries, spell.entriesHigherLevel]
    .filter(Boolean)
    .map(renderFiveToolsEntry)
    .join(" ");
}

function buildStructuredSources() {
  const open5e = readJson(open5ePath).map((row) => row.fields);
  const fiveTools = readJson(fiveToolsPath).spell.filter((spell) => spell.srd52);

  return {
    open5eBySrdName: new Map(open5e.map((spell) => [spell.name, spell])),
    fiveToolsBySrdName: new Map(
      fiveTools.map((spell) => [
        spell.srd52 === true ? spell.name : spell.srd52,
        spell,
      ]),
    ),
    aliasCount: fiveTools.filter((spell) => typeof spell.srd52 === "string")
      .length,
  };
}

function findPdfLine(name) {
  if (!fs.existsSync(pdfTextPath)) {
    return undefined;
  }
  const lines = fs.readFileSync(pdfTextPath, "utf8").split("\n");
  const index = lines.findIndex((line) => line.trim() === name);
  return index === -1 ? undefined : index + 1;
}

function classifyIssue(
  spellLevel,
  open5eReferenceCoverage,
  open5eMarkdownCoverage,
  fiveToolsReferenceCoverage,
  fiveToolsMarkdownCoverage,
  missingWords,
  extraWords,
) {
  const material =
    (open5eReferenceCoverage < materialSimilarityThreshold &&
      fiveToolsReferenceCoverage < materialSimilarityThreshold) ||
    (open5eMarkdownCoverage < materialSimilarityThreshold &&
      fiveToolsMarkdownCoverage < materialSimilarityThreshold);
  if (!material) {
    return "match";
  }

  const mechanicallySuspicious = [...missingWords, ...extraWords].some((word) =>
    /^(d?\d+d\d+|\d+d\d+|\d+|damage|hit|miss|save|saving|action|bonus|reaction|duration|target|targets|feet|round|turn|condition|slot|higher|casting|spell|level)$/.test(
      word,
    ),
  );

  if (spellLevel <= lowLevelMaxSpellLevel && mechanicallySuspicious) {
    return "low-level-needs-pdf-review";
  }
  if (mechanicallySuspicious) {
    return "higher-level-needs-pdf-review";
  }
  return "formatting-or-prose-needs-review";
}

function buildAudit() {
  const markdownSpells = parseMarkdownSpells();
  const byMarkdownName = new Map(markdownSpells.map((spell) => [spell.name, spell]));
  const { open5eBySrdName, fiveToolsBySrdName, aliasCount } =
    buildStructuredSources();
  const issues = [];

  for (const markdownSpell of markdownSpells) {
    const open5e = open5eBySrdName.get(markdownSpell.name);
    const fiveTools = fiveToolsBySrdName.get(markdownSpell.name);

    if (!open5e) {
      issues.push({
        name: markdownSpell.name,
        level: markdownSpell.level,
        file: markdownSpell.file,
        line: markdownSpell.line,
        kind: "missing-open5e-structured-cross-check",
      });
      continue;
    }

    const open5eReference = open5eText(open5e);
    const fiveToolsReference = fiveTools ? fiveToolsText(fiveTools) : "";
    const markdownReference = markdownRulesText(markdownSpell.section);
    const open5eRatio = similarity(open5eReference, markdownReference);
    const open5eMarkdownCoverage = candidateCoverage(
      open5eReference,
      markdownReference,
    );
    const fiveToolsRatio = fiveTools
      ? similarity(fiveToolsReference, markdownReference)
      : 1;
    const fiveToolsMarkdownCoverage = fiveTools
      ? candidateCoverage(fiveToolsReference, markdownReference)
      : 1;
    const missingWords = [
      ...new Set(missingReferenceWords(open5eReference, markdownReference)),
    ].slice(0, 24);
    const extraWords = [
      ...new Set(extraCandidateWords(open5eReference, markdownReference)),
    ].slice(0, 24);
    const kind = classifyIssue(
      markdownSpell.level ?? open5e.level,
      open5eRatio,
      open5eMarkdownCoverage,
      fiveToolsRatio,
      fiveToolsMarkdownCoverage,
      missingWords,
      extraWords,
    );

    if (kind !== "match") {
      const manualReview = manualReviewByName.get(markdownSpell.name);
      issues.push({
        name: markdownSpell.name,
        level: markdownSpell.level ?? open5e.level,
        file: markdownSpell.file,
        line: markdownSpell.line,
        kind,
        manualDisposition: manualReview?.disposition,
        manualEvidence: manualReview?.evidence,
        open5eReferenceCoverage: Number(open5eRatio.toFixed(4)),
        open5eMarkdownCoverage: Number(open5eMarkdownCoverage.toFixed(4)),
        fiveToolsReferenceCoverage: Number(fiveToolsRatio.toFixed(4)),
        fiveToolsMarkdownCoverage: Number(fiveToolsMarkdownCoverage.toFixed(4)),
        missingReferenceWords: missingWords,
        extraMarkdownWords: extraWords,
        pdfTextLine: findPdfLine(markdownSpell.name),
      });
    }
  }

  for (const [name, open5e] of open5eBySrdName.entries()) {
    if (!byMarkdownName.has(name)) {
      issues.push({
        name,
        level: open5e.level,
        kind: "missing-markdown-section",
      });
    }
  }

  const lowLevelIssues = issues.filter(
    (issue) => issue.level !== undefined && issue.level <= lowLevelMaxSpellLevel,
  );
  const higherLevelIssues = issues.filter(
    (issue) => issue.level !== undefined && issue.level > lowLevelMaxSpellLevel,
  );

  return {
    generatedAt: new Date().toISOString(),
    scope:
      "SRD 5.2.1 spell markdown cross-check against local Open5e SRD-2024 structured data and local 5e-tools SRD aliases; PDF text line hints are provenance-review anchors, not automated replacement text.",
    inputs: {
      markdownDir: ".references/srd-5.2.1/Spells",
      open5ePath:
        ".references/inspirations/open5e-api/data/v2/wizards-of-the-coast/srd-2024/Spell.json",
      fiveToolsPath: ".references/5etools-src/data/spells/spells-xphb.json",
      pdfTextPath: fs.existsSync(pdfTextPath) ? pdfTextPath : null,
    },
    metrics: {
      markdownSpellSections: markdownSpells.length,
      open5eStructuredSpells: open5eBySrdName.size,
      fiveToolsSrdAliasRows: fiveToolsBySrdName.size,
      fiveToolsRenamedSrdAliasRows: aliasCount,
      issueCount: issues.length,
      lowLevelIssueCount: lowLevelIssues.length,
      higherLevelIssueCount: higherLevelIssues.length,
    },
    issues,
  };
}

function renderIssueTable(issues) {
  if (issues.length === 0) {
    return ["No findings."];
  }
  return [
    "| Spell | Level | Kind | Manual disposition | Source | Structured similarity | Missing reference words | PDF text line |",
    "|---|---:|---|---|---|---:|---|---:|",
    ...issues.map((issue) => {
      const source = issue.file ? `${issue.file}:${issue.line}` : "";
      const ratio = [
        issue.open5eReferenceCoverage === undefined
          ? ""
          : `Open5e ref ${issue.open5eReferenceCoverage}`,
        issue.open5eMarkdownCoverage === undefined
          ? ""
          : `Open5e md ${issue.open5eMarkdownCoverage}`,
        issue.fiveToolsReferenceCoverage === undefined
          ? ""
          : `5e-tools ref ${issue.fiveToolsReferenceCoverage}`,
        issue.fiveToolsMarkdownCoverage === undefined
          ? ""
          : `5e-tools md ${issue.fiveToolsMarkdownCoverage}`,
      ]
        .filter(Boolean)
        .join("<br>");
      const driftWords = [
        ...(issue.missingReferenceWords ?? []).map((word) => `-${word}`),
        ...(issue.extraMarkdownWords ?? []).map((word) => `+${word}`),
      ].join(", ");
      return `| ${issue.name} | ${issue.level ?? ""} | ${issue.kind} | ${issue.manualDisposition ?? ""} | ${source} | ${ratio} | ${driftWords} | ${issue.pdfTextLine ?? ""} |`;
    }),
  ];
}

function renderMarkdownReport(audit) {
  const lowLevelIssues = audit.issues.filter(
    (issue) => issue.level !== undefined && issue.level <= lowLevelMaxSpellLevel,
  );
  const higherLevelIssues = audit.issues.filter(
    (issue) => issue.level !== undefined && issue.level > lowLevelMaxSpellLevel,
  );
  const unlevelledIssues = audit.issues.filter((issue) => issue.level === undefined);

  return [
    "# SRD 5.2.1 Spell Markdown Audit",
    "",
    "Generated by `node scripts/srd521-spell-markdown-audit.cjs`.",
    "",
    "This report treats `.references/srd-5.2.1/Spells/*.md` as the corpus to repair, not as expendable output. Structured sources are cross-check signals. PDF text line hints identify where manual provenance review should confirm the final markdown correction.",
    "",
    "## Metrics",
    "",
    `- Markdown spell sections: ${audit.metrics.markdownSpellSections}`,
    `- Open5e SRD-2024 structured spell rows: ${audit.metrics.open5eStructuredSpells}`,
    `- Local 5e-tools SRD alias rows: ${audit.metrics.fiveToolsSrdAliasRows}`,
    `- Local 5e-tools renamed SRD alias rows: ${audit.metrics.fiveToolsRenamedSrdAliasRows}`,
    `- Findings: ${audit.metrics.issueCount}`,
    `- Level <= 2 findings: ${audit.metrics.lowLevelIssueCount}`,
    `- Level > 2 findings: ${audit.metrics.higherLevelIssueCount}`,
    "",
    "## Level <= 2 Findings",
    "",
    "The independent low-level audit reviewed all cantrip through level-2 spell sections against PDF provenance and structured cross-checks. The PDF-confirmed markdown defects in the current app frontier are Acid Arrow, Enlarge/Reduce, and Levitate. Augury is table-rendering noise. The table below is the automated candidate list, not a final manual disposition for every row.",
    "",
    ...renderIssueTable(lowLevelIssues),
    "",
    "### Level <= 2 Manual PDF Review Notes",
    "",
    ...lowLevelIssues.flatMap((issue) =>
      issue.manualEvidence
        ? [`- ${issue.name}: ${issue.manualEvidence}`]
        : [],
    ),
    "",
    "## Level > 2 Findings",
    "",
    "These are outside the current level-3 app frontier. They are kept in the generated report so the corpus can be repaired fully without mixing those details into level-3 product decisions.",
    "",
    ...renderIssueTable(higherLevelIssues),
    "",
    "## Unlevelled Findings",
    "",
    ...renderIssueTable(unlevelledIssues),
    "",
  ].join("\n");
}

const audit = buildAudit();
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(jsonReportPath, `${JSON.stringify(audit, null, 2)}\n`);
fs.writeFileSync(mdReportPath, renderMarkdownReport(audit));

console.log(`Wrote ${jsonReportPath}`);
console.log(`Wrote ${mdReportPath}`);
console.log(
  `Findings: ${audit.metrics.issueCount}; level <= 2: ${audit.metrics.lowLevelIssueCount}; level > 2: ${audit.metrics.higherLevelIssueCount}`,
);
