#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const experimentRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(experimentRoot, "../..");
const inputRoot = path.join(experimentRoot, "input");

const staticFiles = [
  "ASSUMPTIONS.md",
  "UBIQUITOUS_LANGUAGE.md",
  "docs/adr/0001-forest-of-qnt-slices.md",
  "plans/rules-kernel-coverage/README.md",
  "plans/rules-kernel-coverage/GENERATOR_READINESS_CLOSURE_REPORT.md",
  "plans/rules-kernel-coverage/generator-readiness.jsonl",
  "plans/rules-kernel-coverage/obligations.jsonl",
  "plans/rules-kernel-coverage/profile-obligations.jsonl",
  "plans/rules-kernel-coverage/qnt-owner-roles.jsonl",
  "plans/rules-kernel-coverage/kernel-ir-boundaries.jsonl",
  "plans/unit-profile-coverage/LEVEL1_2_ULTRA_GOLDEN_SUMMARY.md",
  "plans/unit-profile-coverage/level1-2-qnt-mbt-join.json",
  "plans/unit-profile-coverage/level1-2-full-support.json",
  "plans/unit-profile-coverage/mcp-scenario-evidence.json",
];

const rawRoots = [".references/srd-5.2.1"];
const characterCreationQntRoots = ["packages/character-creation-runtime"];

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readJsonl(relativePath) {
  return readText(relativePath)
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

function walkFiles(relativeDir, predicate) {
  const root = path.join(repoRoot, relativeDir);
  const out = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        const rel = path.relative(repoRoot, full).split(path.sep).join("/");
        if (!predicate || predicate(rel)) out.push(rel);
      }
    }
  }
  return out.sort();
}

function resolveQntImport(fromRelativePath, importPath) {
  if (!importPath.startsWith(".")) return null;
  const fromDir = path.dirname(fromRelativePath);
  const candidate = path.normalize(path.join(fromDir, `${importPath}.qnt`)).split(path.sep).join("/");
  const full = path.join(repoRoot, candidate);
  return fs.existsSync(full) ? candidate : null;
}

function qntImportClosure(seedPaths) {
  const seen = new Set();
  const stack = [...seedPaths];
  const importRe = /import\s+[^"\n]+from\s+"([^"]+)"/g;

  while (stack.length > 0) {
    const relativePath = stack.pop();
    if (seen.has(relativePath)) continue;
    seen.add(relativePath);

    const full = path.join(repoRoot, relativePath);
    if (!fs.existsSync(full)) continue;
    const text = fs.readFileSync(full, "utf8");
    let match;
    while ((match = importRe.exec(text)) !== null) {
      const resolved = resolveQntImport(relativePath, match[1]);
      if (resolved && !seen.has(resolved)) stack.push(resolved);
    }
  }

  return [...seen].sort();
}

function copyFile(relativePath) {
  const src = path.join(repoRoot, relativePath);
  const dest = path.join(inputRoot, relativePath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function cleanInputRoot() {
  fs.rmSync(inputRoot, { recursive: true, force: true });
  fs.mkdirSync(inputRoot, { recursive: true });
}

const join = readJson("plans/unit-profile-coverage/level1-2-qnt-mbt-join.json");
const generatorRows = readJsonl("plans/rules-kernel-coverage/generator-readiness.jsonl");
const generatorByObligation = new Map(generatorRows.map((row) => [row.obligationId, row]));
const scopedObligationIds = [...new Set(join.rows.map((row) => row.obligationId))].sort();

const scopedGeneratorRows = scopedObligationIds
  .map((id) => generatorByObligation.get(id))
  .filter(Boolean)
  .filter((row) => row.status === "generation-subset-clean");

const battleQntSeeds = new Set();
for (const row of scopedGeneratorRows) {
  for (const qnt of row.semanticCore ?? []) battleQntSeeds.add(qnt);
  for (const qnt of row.proofOnly ?? []) battleQntSeeds.add(qnt);
}
for (const row of join.rows) {
  for (const witness of row.parityWitnesses ?? []) {
    if (witness.qntSpecPath) battleQntSeeds.add(witness.qntSpecPath);
  }
}

const characterCreationQnt = characterCreationQntRoots.flatMap((root) =>
  walkFiles(root, (rel) => rel.endsWith(".qnt")),
);
const allQnt = qntImportClosure([...battleQntSeeds, ...characterCreationQnt]);
const rawFiles = rawRoots.flatMap((root) => walkFiles(root, (rel) => rel.endsWith(".md")));
const allFiles = [...new Set([...staticFiles, ...rawFiles, ...allQnt])].sort();

cleanInputRoot();
for (const relativePath of allFiles) {
  copyFile(relativePath);
}

const manifest = {
  generatedBy: "experiments/cleanroom-rust-engine/tools/prepare-inputs.cjs",
  generatedAt: new Date().toISOString(),
  scope: {
    edition: "SRD 5.2.1",
    characterLevels: [1, 2],
    domains: ["character-creation", "battle"],
    forbiddenSources: [
      "production TypeScript runtime code",
      "production TypeScript tests",
      "old worktrees or task branches",
    ],
  },
  metrics: {
    scopedObligations: scopedObligationIds.length,
    scopedGenerationSubsetCleanRows: scopedGeneratorRows.length,
    copiedRawFiles: rawFiles.length,
    copiedQntFiles: allQnt.length,
    copiedFiles: allFiles.length,
  },
  scopedObligationIds,
  generatorReadinessRows: scopedGeneratorRows.map((row) => ({
    obligationId: row.obligationId,
    status: row.status,
    semanticCore: row.semanticCore ?? [],
    proofOnly: row.proofOnly ?? [],
    generatorSubset: row.generatorSubset ?? [],
    blockedBy: row.blockedBy ?? [],
    followUpTaskIds: row.followUpTaskIds ?? [],
  })),
  files: {
    raw: rawFiles,
    qnt: allQnt,
    context: staticFiles,
  },
};

fs.writeFileSync(
  path.join(inputRoot, "cleanroom-input-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log(`Prepared cleanroom input at ${path.relative(repoRoot, inputRoot)}`);
console.log(JSON.stringify(manifest.metrics, null, 2));
