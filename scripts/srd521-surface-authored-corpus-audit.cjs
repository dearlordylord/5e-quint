const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const referenceRoot = path.join(root, ".references/srd-5.2.1");
const contentDir = path.join(root, "packages/surface/content");
const reportDir = path.join(root, "plans/srd-corpus-audit");
const jsonReportPath = path.join(reportDir, "surface-authored-corpus-audit.json");
const mdReportPath = path.join(reportDir, "surface-authored-corpus-audit.md");
const unitCatalogPath = path.join(
  root,
  "packages/surface/src/surface/unit-catalog.ts",
);
const statBlockCatalogPath = path.join(
  root,
  "packages/surface/src/surface/stat-block-catalog.ts",
);

function normalizeAnchor(value) {
  return String(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function walkMarkdownFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkMarkdownFiles(filePath, files);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(filePath);
    }
  }
  return files;
}

function lineNumber(raw, index) {
  return raw.slice(0, index).split("\n").length;
}

function buildReferenceIndex() {
  const markdownFiles = walkMarkdownFiles(referenceRoot).sort();
  const fileByRel = new Map();
  const headingsByFile = new Map();
  const proseAnchorsByFile = new Map();

  for (const filePath of markdownFiles) {
    const rel = path.relative(referenceRoot, filePath).replace(/\\/g, "/");
    const raw = fs.readFileSync(filePath, "utf8");
    fileByRel.set(rel, filePath);

    const headings = [...raw.matchAll(/^(#{1,6})\s+(.+)$/gm)].map((match) => ({
      rel,
      line: lineNumber(raw, match.index),
      text: match[2].trim(),
      normalized: normalizeAnchor(match[2]),
    }));
    headingsByFile.set(rel, headings);

    const proseAnchors = [
      ...raw.matchAll(/(?:^|\n)(?:[-*]\s+)?\*\*\*?([^*\n.]+(?: [^*\n.]+)*)\.\*\*\*?/g),
    ].map((match) => ({
      rel,
      line: lineNumber(raw, match.index),
      text: match[1].trim(),
      normalized: normalizeAnchor(match[1]),
    }));
    proseAnchorsByFile.set(rel, proseAnchors);
  }

  return { fileByRel, headingsByFile, proseAnchorsByFile };
}

function readSurfaceRecords() {
  const records = [];
  const installedUnitFiles = importedContentFiles(unitCatalogPath);
  const installedStatBlockFiles = importedContentFiles(statBlockCatalogPath);

  function visit(value, file, index) {
    if (Array.isArray(value)) {
      value.forEach((entry, entryIndex) => visit(entry, file, entryIndex));
      return;
    }
    if (
      value &&
      typeof value === "object" &&
      value.provenance?.kind === "srd-5.2.1"
    ) {
      records.push({
        contentPath: `packages/surface/content/${file}`,
        contentFile: file,
        index,
        id: value.id,
        kind: value.kind ?? "unknown",
        name: value.name ?? value.statBlock?.displayName ?? value.id,
        section: value.provenance.section,
        value,
        catalogBoundary:
          value.kind === "statBlock"
            ? installedStatBlockFiles.has(file)
              ? "srd-stat-block-collection"
              : "not-installed"
            : installedUnitFiles.has(file)
              ? "srd-unit-collection"
              : "authored-not-installed",
      });
    }
  }

  for (const file of fs
    .readdirSync(contentDir)
    .filter((entry) => entry.endsWith(".json"))
    .sort()) {
    visit(JSON.parse(fs.readFileSync(path.join(contentDir, file), "utf8")), file);
  }

  return records;
}

function importedContentFiles(sourcePath) {
  if (!fs.existsSync(sourcePath)) {
    return new Set();
  }
  const raw = fs.readFileSync(sourcePath, "utf8");
  return new Set(
    [...raw.matchAll(/from\s+"..\/..\/content\/([^"]+\.json)"/g)].map(
      (match) => match[1],
    ),
  );
}

function addIfPresent(paths, fileByRel, rel) {
  if (fileByRel.has(rel)) {
    paths.push(rel);
  }
}

function candidateFiles(base, fileByRel) {
  const files = [];
  const withoutMd = base.replace(/\.md$/, "");

  addIfPresent(files, fileByRel, base);
  addIfPresent(files, fileByRel, `${withoutMd}.md`);

  if (base === "MagicItems") {
    for (const rel of fileByRel.keys()) {
      if (rel.startsWith("Magic-Items/Items-")) {
        files.push(rel);
      }
    }
  }
  if (base === "Equipment") {
    addIfPresent(files, fileByRel, "Equipment.md");
  }
  if (base === "Feats" || base.startsWith("Feats/")) {
    addIfPresent(files, fileByRel, "Feats.md");
  }
  if (base === "Character-Origins" || base.startsWith("Character-Origins/")) {
    addIfPresent(files, fileByRel, "Character-Origins.md");
  }
  if (base.startsWith("Species/")) {
    addIfPresent(files, fileByRel, "Character-Origins.md");
  }
  if (base.startsWith("Classes/")) {
    const className = base.split("/")[1];
    addIfPresent(files, fileByRel, `Classes/${className}.md`);
  }
  if (base.startsWith("Spells/Descriptions-")) {
    for (const rel of fileByRel.keys()) {
      if (rel.startsWith("Spells/Descriptions-")) {
        files.push(rel);
      }
    }
  }

  return [...new Set(files)];
}

function splitSectionPart(part) {
  const hashIndex = part.indexOf("#");
  const colonIndex = part.indexOf(":");
  if (hashIndex !== -1 && (colonIndex === -1 || hashIndex < colonIndex)) {
    return {
      base: part.slice(0, hashIndex),
      separator: "#",
      suffix: part.slice(hashIndex + 1),
    };
  }
  if (colonIndex !== -1) {
    return {
      base: part.slice(0, colonIndex),
      separator: ":",
      suffix: part.slice(colonIndex + 1),
    };
  }
  return { base: part, separator: "", suffix: "" };
}

function lineCountFor(rel) {
  return fs.readFileSync(path.join(referenceRoot, rel), "utf8").split("\n")
    .length;
}

function resolveLineRanges(part, base, suffix, files) {
  const rel = files[0];
  const lineCount = lineCountFor(rel);
  const invalidRanges = suffix
    .split(",")
    .map((range) => range.trim())
    .filter(Boolean)
    .filter((range) => {
      const match = range.match(/^(\d+)(?:-(\d+))?$/);
      if (!match) {
        return true;
      }
      const start = Number(match[1]);
      const end = match[2] === undefined ? start : Number(match[2]);
      return start < 1 || end < start || end > lineCount;
    });

  return {
    part,
    status: invalidRanges.length === 0 ? "ok-line-range" : "bad-line-range",
    canonical: `${rel}:${suffix}`,
    legacyBase: rel !== base && rel !== `${base}.md`,
    invalidRanges,
  };
}

function anchorMatches(anchors, target, mode) {
  return anchors.filter((anchor) => {
    if (mode === "exact") {
      return anchor.normalized === target;
    }
    if (mode === "prefix") {
      return anchor.normalized.startsWith(target);
    }
    return (
      anchor.normalized.endsWith(target) || target.endsWith(anchor.normalized)
    );
  });
}

function resolveAnchor(part, base, suffix, files, index) {
  const target = normalizeAnchor(suffix);

  for (const mode of ["exact", "prefix", "suffix"]) {
    for (const rel of files) {
      const headings = index.headingsByFile.get(rel) ?? [];
      const matches = anchorMatches(headings, target, mode);
      if (matches.length > 0) {
        const match = matches[0];
        return {
          part,
          status:
            rel === base || rel === `${base}.md`
              ? "ok-heading"
              : "ok-heading-alias",
          canonical: `${match.rel}#${match.text}`,
        };
      }
    }

    for (const rel of files) {
      const proseAnchors = index.proseAnchorsByFile.get(rel) ?? [];
      const matches = anchorMatches(proseAnchors, target, mode);
      if (matches.length > 0) {
        const match = matches[0];
        return {
          part,
          status:
            rel === base || rel === `${base}.md`
              ? "ok-prose-anchor"
              : "ok-prose-anchor-alias",
          canonical: `${match.rel}:${match.line} (${match.text})`,
        };
      }
    }
  }

  return {
    part,
    status: "missing-anchor",
    canonical: "",
  };
}

function resolveSection(section, index) {
  return section
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const parsed = splitSectionPart(part);
      const files = candidateFiles(parsed.base, index.fileByRel);
      if (files.length === 0) {
        return {
          part,
          status: "missing-file",
          canonical: "",
        };
      }
      if (parsed.separator === ":") {
        return resolveLineRanges(part, parsed.base, parsed.suffix, files);
      }
      if (parsed.separator === "#") {
        return resolveAnchor(part, parsed.base, parsed.suffix, files, index);
      }
      return {
        part,
        status:
          files[0] === parsed.base || files[0] === `${parsed.base}.md`
            ? "ok-file"
            : "ok-file-alias",
        canonical: files[0],
      };
    });
}

function statusSeverity(status) {
  if (status.startsWith("ok-") && status.endsWith("-alias")) {
    return "warning";
  }
  if (status.startsWith("ok-")) {
    return "ok";
  }
  return "failure";
}

function collectUnitReferences(records) {
  const refs = [];

  function add(record, fieldPath, targetUnitId, relation) {
    refs.push({
      contentPath: record.contentPath,
      id: record.id,
      kind: record.kind,
      name: record.name,
      fieldPath,
      targetUnitId,
      relation,
    });
  }

  function scanValue(record, value, fieldPath) {
    if (Array.isArray(value)) {
      value.forEach((entry, index) =>
        scanValue(record, entry, `${fieldPath}[${index}]`),
      );
      return;
    }
    if (!value || typeof value !== "object") {
      return;
    }

    if (
      value.kind === "unit_ref" &&
      typeof value.unitId === "string"
    ) {
      add(record, `${fieldPath}.unitId`, value.unitId, "starting-equipment");
    }
    if (typeof value.resourceUnitId === "string") {
      add(
        record,
        `${fieldPath}.resourceUnitId`,
        value.resourceUnitId,
        "resource-link",
      );
    }
    if (Array.isArray(value.spellIds)) {
      value.spellIds.forEach((spellId, index) => {
        if (typeof spellId === "string") {
          add(record, `${fieldPath}.spellIds[${index}]`, spellId, "spell-list");
        }
      });
    }

    for (const [key, child] of Object.entries(value)) {
      scanValue(record, child, fieldPath ? `${fieldPath}.${key}` : key);
    }
  }

  for (const record of records) {
    const value = record.value;
    if (Array.isArray(value.featureGrants)) {
      value.featureGrants.forEach((grant, index) => {
        if (typeof grant.unitId === "string") {
          add(
            record,
            `featureGrants[${index}].unitId`,
            grant.unitId,
            "feature-grant",
          );
        }
      });
    }
    if (Array.isArray(value.subclassChoices)) {
      value.subclassChoices.forEach((choice, choiceIndex) => {
        if (Array.isArray(choice.options)) {
          choice.options.forEach((option, optionIndex) => {
            if (typeof option === "string") {
              add(
                record,
                `subclassChoices[${choiceIndex}].options[${optionIndex}]`,
                option,
                "subclass-choice",
              );
            }
          });
        }
      });
    }
    if (value.traits && typeof value.traits === "object") {
      for (const [trait, unitId] of Object.entries(value.traits)) {
        if (typeof unitId === "string") {
          add(record, `traits.${trait}`, unitId, "species-trait");
        }
      }
    }
    scanValue(record, value.startingEquipment, "startingEquipment");
    scanValue(record, value.mechanics, "mechanics");
  }

  return refs;
}

function buildSpellHeadingSet(index) {
  const spellHeadings = new Set();
  for (const [rel, headings] of index.headingsByFile.entries()) {
    if (!rel.startsWith("Spells/Descriptions-")) {
      continue;
    }
    for (const heading of headings) {
      spellHeadings.add(heading.normalized);
    }
  }
  return spellHeadings;
}

function buildAudit() {
  const index = buildReferenceIndex();
  const records = readSurfaceRecords();
  const spellHeadings = buildSpellHeadingSet(index);
  const authoredUnitIds = new Set(
    records
      .filter((record) => record.kind !== "statBlock")
      .map((record) => record.id),
  );
  const checks = records.flatMap((record) =>
    resolveSection(record.section, index).map((resolution) => {
      const { value, ...recordForReport } = record;
      return {
        ...recordForReport,
        ...resolution,
        severity: statusSeverity(resolution.status),
      };
    }),
  );
  const unitReferenceChecks = collectUnitReferences(records).map((ref) => {
    const authored = authoredUnitIds.has(ref.targetUnitId);
    const scannerVisibleSrdSpell =
      ref.relation === "spell-list" &&
      spellHeadings.has(normalizeAnchor(ref.targetUnitId.replace(/_/g, " ")));
    return {
      ...ref,
      status: authored
        ? "ok-authored-unit"
        : scannerVisibleSrdSpell
          ? "srd-spell-reference-without-authored-unit"
          : "missing-authored-unit",
      severity: authored ? "ok" : scannerVisibleSrdSpell ? "warning" : "failure",
    };
  });
  const statusCounts = {};
  const kindCounts = {};
  const catalogBoundaryCounts = {};
  for (const check of checks) {
    statusCounts[check.status] = (statusCounts[check.status] ?? 0) + 1;
    kindCounts[check.kind] = (kindCounts[check.kind] ?? 0) + 1;
    catalogBoundaryCounts[check.catalogBoundary] =
      (catalogBoundaryCounts[check.catalogBoundary] ?? 0) + 1;
  }
  const unitReferenceStatusCounts = {};
  for (const check of unitReferenceChecks) {
    unitReferenceStatusCounts[check.status] =
      (unitReferenceStatusCounts[check.status] ?? 0) + 1;
  }

  return {
    generatedAt: new Date().toISOString(),
    scope:
      "SRD 5.2.1 authored Surface corpus provenance audit over generated packages/surface/content JSON records. Includes Unit records and StatBlock records with SRD provenance.",
    metrics: {
      authoredRecords: records.length,
      provenanceParts: checks.length,
      failures: checks.filter((check) => check.severity === "failure").length,
      warnings: checks.filter((check) => check.severity === "warning").length,
      unitReferenceChecks: unitReferenceChecks.length,
      unitReferenceFailures: unitReferenceChecks.filter(
        (check) => check.severity === "failure",
      ).length,
      unitReferenceWarnings: unitReferenceChecks.filter(
        (check) => check.severity === "warning",
      ).length,
      statusCounts,
      kindCounts,
      catalogBoundaryCounts,
      unitReferenceStatusCounts,
    },
    checks,
    unitReferenceChecks,
  };
}

function renderRows(checks) {
  if (checks.length === 0) {
    return ["| _none_ | _none_ | _none_ | _none_ | _none_ | _none_ |"];
  }
  return checks.map(
    (check) =>
      `| \`${check.id ?? ""}\` | ${check.kind} | ${check.name ?? ""} | \`${check.contentPath}${check.index == null ? "" : `[${check.index}]`}\` | ${check.status} | \`${check.part}\` -> \`${check.canonical}\` |`,
  );
}

function renderMarkdownReport(audit) {
  const failures = audit.checks.filter((check) => check.severity === "failure");
  const warnings = audit.checks.filter((check) => check.severity === "warning");
  const referenceFailures = audit.unitReferenceChecks.filter(
    (check) => check.severity === "failure",
  );
  const referenceWarnings = audit.unitReferenceChecks.filter(
    (check) => check.severity === "warning",
  );
  return [
    "# SRD 5.2.1 Surface Authored Corpus Audit",
    "",
    "Generated by `node scripts/srd521-surface-authored-corpus-audit.cjs`.",
    "",
    "This report audits SRD-provenance authored Surface content, not only spells. It checks generated `packages/surface/content/*.json` records because those are the production authored-content projection consumed by Surface catalogs. When a source fix is needed, edit the matching `.dhall` source and regenerate JSON.",
    "",
    "A provenance part is considered scanner-visible when this script can resolve it to a local SRD markdown file, heading, prose anchor, or line range under `.references/srd-5.2.1/`.",
    "",
    "## Metrics",
    "",
    `- Authored SRD records: ${audit.metrics.authoredRecords}`,
    `- Provenance parts checked: ${audit.metrics.provenanceParts}`,
    `- Failures: ${audit.metrics.failures}`,
    `- Warnings: ${audit.metrics.warnings}`,
    `- Unit reference checks: ${audit.metrics.unitReferenceChecks}`,
    `- Unit reference failures: ${audit.metrics.unitReferenceFailures}`,
    `- Unit reference warnings: ${audit.metrics.unitReferenceWarnings}`,
    "",
    "### Status Counts",
    "",
    "| Status | Count |",
    "|---|---:|",
    ...Object.entries(audit.metrics.statusCounts)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([status, count]) => `| ${status} | ${count} |`),
    "",
    "### Authored Record Kinds",
    "",
    "| Kind | Count |",
    "|---|---:|",
    ...Object.entries(audit.metrics.kindCounts)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([kind, count]) => `| ${kind} | ${count} |`),
    "",
    "### Catalog Boundaries",
    "",
    "| Boundary | Provenance parts |",
    "|---|---:|",
    ...Object.entries(audit.metrics.catalogBoundaryCounts)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([boundary, count]) => `| ${boundary} | ${count} |`),
    "",
    "### Unit Reference Closure",
    "",
    "This checks scanner-visible Unit references inside authored records: class/subclass feature grants, subclass choices, species trait maps, starting-equipment Unit refs, resource Unit links, and spell-list `spellIds` arrays.",
    "",
    "| Status | Count |",
    "|---|---:|",
    ...Object.entries(audit.metrics.unitReferenceStatusCounts)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([status, count]) => `| ${status} | ${count} |`),
    "",
    "#### Unit Reference Failures",
    "",
    "| Owner | Relation | Field | Target Unit |",
    "|---|---|---|---|",
    ...(referenceFailures.length === 0
      ? ["| _none_ | _none_ | _none_ | _none_ |"]
      : referenceFailures.map(
          (check) =>
            `| \`${check.id}\` | ${check.relation} | \`${check.fieldPath}\` | \`${check.targetUnitId}\` |`,
        )),
    "",
    "#### Unit Reference Warnings",
    "",
    "These references point to scanner-visible SRD spell sections, but the target spell is not authored as a Surface Unit yet.",
    "",
    "| Owner | Relation | Field | Target Unit |",
    "|---|---|---|---|",
    ...(referenceWarnings.length === 0
      ? ["| _none_ | _none_ | _none_ | _none_ |"]
      : referenceWarnings.map(
          (check) =>
            `| \`${check.id}\` | ${check.relation} | \`${check.fieldPath}\` | \`${check.targetUnitId}\` |`,
        )),
    "",
    "## Failures",
    "",
    "| Id | Kind | Name | Content | Status | Resolution |",
    "|---|---|---|---|---|---|",
    ...renderRows(failures),
    "",
    "## Warnings",
    "",
    "Warnings are scanner-visible through a known legacy alias, but the provenance string is not canonical for the markdown file it resolves to. They do not block the audit.",
    "",
    "| Id | Kind | Name | Content | Status | Resolution |",
    "|---|---|---|---|---|---|",
    ...renderRows(warnings.slice(0, 200)),
    ...(warnings.length > 200
      ? [
          `| ... | ... | ... | ... | ... | ${warnings.length - 200} additional warnings omitted; see JSON report. |`,
        ]
      : []),
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
  `Surface authored corpus audit: ${audit.metrics.failures} provenance failures, ${audit.metrics.unitReferenceFailures} unit reference failures, ${audit.metrics.warnings} warnings, ${audit.metrics.provenanceParts} provenance parts.`,
);

if (audit.metrics.failures > 0 || audit.metrics.unitReferenceFailures > 0) {
  process.exitCode = 1;
}
