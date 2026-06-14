#!/usr/bin/env node
"use strict";

// One-way, allowlist-enforced sync of the cleanroom input corpus.
//
// Run from the source repo root. Wipes <target>/cleanroom-input/ and rebuilds
// it from the allowlist below, then writes cleanroom-input/MANIFEST.md with
// the source commit SHA, copy date, and a per-file sha256 inventory. Cleanroom
// tasks declare which manifest SHA they implement against
// (plans/CLEANROOM_RUST_EXPERIMENT.md, "Restart Decision").
//
// Usage: node scripts/sync-cleanroom-input.cjs [--target <path>] [--dry-run]

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const DEFAULT_TARGET = "/workspace/typescript/dnd-cleanroom-rust";

// Allowlist per plans/CLEANROOM_RUST_EXPERIMENT.md "Allowed Inputs". Each rule
// maps a source root to a destination root inside cleanroom-input/.
// kind "flat" copies matching files directly under sourceRoot; kind "tree"
// copies matching files recursively, preserving subdirectories.
//
// QNT entries set `packagesRelative: true` instead of a destRoot: the file is
// copied to qnt/<path-relative-to-packages/>, preserving the source layout so
// cross-package relative imports (e.g. `../shared-algebras/proofs/rule-core/`)
// resolve identically in the cleanroom. Flattening these breaks imports; the
// post-sync import check (verifyImportsResolve) is the executable guard.
const ALLOWLIST = [
  {
    sourceRoot: ".references/srd-5.2.1",
    destRoot: "raw/srd-5.2.1",
    kind: "tree",
    extension: ".md",
  },
  {
    sourceRoot: "UBIQUITOUS_LANGUAGE.md",
    destRoot: "domain/UBIQUITOUS_LANGUAGE.md",
    kind: "file",
  },
  {
    sourceRoot: "plans/CLEANROOM_ASSUMPTIONS.md",
    destRoot: "domain/CLEANROOM_ASSUMPTIONS.md",
    kind: "file",
  },
  {
    sourceRoot: "packages/battle-runtime",
    packagesRelative: true,
    kind: "flat",
    extension: ".qnt",
  },
  {
    sourceRoot: "packages/character-creation-runtime",
    packagesRelative: true,
    kind: "flat",
    extension: ".qnt",
  },
  {
    sourceRoot: "packages/character-sheet-runtime",
    packagesRelative: true,
    kind: "flat",
    extension: ".qnt",
  },
  {
    sourceRoot: "packages/character-battle-runtime",
    packagesRelative: true,
    kind: "flat",
    extension: ".qnt",
  },
  {
    sourceRoot: "packages/shared-algebras/proofs/rule-core",
    packagesRelative: true,
    kind: "tree",
    extension: ".qnt",
  },
];

// Destination root for an allowlist rule. QNT rules derive it from the
// source's path under packages/ so the cleanroom mirrors the source layout.
function destRootFor(rule) {
  if (rule.packagesRelative) {
    return path.join("qnt", path.relative("packages", rule.sourceRoot));
  }
  return rule.destRoot;
}

function fail(message) {
  process.stderr.write(`sync-cleanroom-input: ${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { target: DEFAULT_TARGET, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--target") {
      i += 1;
      if (!argv[i]) fail("--target requires a path");
      args.target = argv[i];
    } else if (argv[i] === "--dry-run") {
      args.dryRun = true;
    } else {
      fail(`unknown argument ${argv[i]}`);
    }
  }
  return args;
}

function git(repoRoot, ...gitArgs) {
  return execFileSync("git", ["-C", repoRoot, ...gitArgs], {
    encoding: "utf8",
  }).trim();
}

function listTree(root, extension) {
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith(extension))
        found.push(full);
    }
  };
  walk(root);
  return found.sort();
}

function listFlat(root, extension) {
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => path.join(root, entry.name))
    .sort();
}

function collectCopies(repoRoot) {
  const copies = [];
  for (const rule of ALLOWLIST) {
    const sourceAbs = path.join(repoRoot, rule.sourceRoot);
    if (!fs.existsSync(sourceAbs)) {
      fail(`allowlisted source missing: ${rule.sourceRoot}`);
    }
    const destRoot = destRootFor(rule);
    if (rule.kind === "file") {
      copies.push({ source: rule.sourceRoot, dest: destRoot });
    } else {
      const files =
        rule.kind === "flat"
          ? listFlat(sourceAbs, rule.extension)
          : listTree(sourceAbs, rule.extension);
      for (const file of files) {
        const rel = path.relative(sourceAbs, file);
        copies.push({
          source: path.join(rule.sourceRoot, rel),
          dest: path.join(destRoot, rel),
        });
      }
    }
  }
  return copies;
}

// Every `import ... from "<path>"` in a copied .qnt must resolve to another
// copied .qnt. A broken relative import would otherwise surface only when a
// cleanroom agent runs quint-connect and hits a Quint resolution error — far
// from the layout decision that caused it. This makes the corpus self-consistent
// at sync time.
function verifyImportsResolve(inputRoot, inventory) {
  const present = new Set(inventory.map((item) => item.dest));
  // Only `import`/`export ... from "<path>"` statement lines carry a relative
  // module path; a bare `from "..."` elsewhere is prose in a comment or string.
  const importLine = /^\s*(?:import|export)\b.*?\bfrom\s+"([^"]+)"/;
  const dangling = [];
  let checked = 0;
  for (const item of inventory) {
    if (!item.dest.endsWith(".qnt")) continue;
    const text = fs.readFileSync(path.join(inputRoot, item.dest), "utf8");
    for (const line of text.split("\n")) {
      const match = importLine.exec(line);
      if (match === null) continue;
      checked += 1;
      const importPath = match[1];
      // Quint resolves `from "X"` relative to the importing file; bare names
      // (no leading . or /) are stdlib modules, not corpus files.
      if (!importPath.startsWith(".") && !importPath.startsWith("/")) continue;
      const resolvedDir = path.dirname(item.dest);
      const target = `${path.join(resolvedDir, importPath)}.qnt`;
      if (!present.has(target)) {
        dangling.push(`${item.dest}: from "${importPath}" -> missing ${target}`);
      }
    }
  }
  if (dangling.length > 0) {
    fail(
      `QNT import resolution failed (${dangling.length} dangling); the copied ` +
        `layout breaks relative imports:\n${dangling.join("\n")}`,
    );
  }
  return checked;
}

function requireCleanSources(repoRoot) {
  const roots = ALLOWLIST.map((rule) => rule.sourceRoot);
  const status = git(repoRoot, "status", "--porcelain", "--", ...roots);
  if (status !== "") {
    fail(
      `allowlisted sources have uncommitted changes; commit them first so the manifest SHA is truthful:\n${status}`,
    );
  }
}

function sha256(filePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = path.resolve(__dirname, "..");
  requireCleanSources(repoRoot);
  const sourceSha = git(repoRoot, "rev-parse", "HEAD");
  const copies = collectCopies(repoRoot);

  if (args.dryRun) {
    for (const copy of copies) {
      process.stdout.write(`${copy.source} -> cleanroom-input/${copy.dest}\n`);
    }
    process.stdout.write(
      `dry run: ${copies.length} files, source SHA ${sourceSha}\n`,
    );
    return;
  }

  if (!fs.existsSync(args.target)) {
    fail(`target repo does not exist: ${args.target}`);
  }
  const inputRoot = path.join(args.target, "cleanroom-input");
  fs.rmSync(inputRoot, { recursive: true, force: true });

  const inventory = [];
  for (const copy of copies) {
    const sourceAbs = path.join(repoRoot, copy.source);
    const destAbs = path.join(inputRoot, copy.dest);
    fs.mkdirSync(path.dirname(destAbs), { recursive: true });
    fs.copyFileSync(sourceAbs, destAbs);
    inventory.push({
      dest: copy.dest,
      source: copy.source,
      sha256: sha256(destAbs),
    });
  }

  const importsChecked = verifyImportsResolve(inputRoot, inventory);

  const counts = new Map();
  for (const item of inventory) {
    const top = item.dest.split("/").slice(0, 2).join("/");
    counts.set(top, (counts.get(top) ?? 0) + 1);
  }

  const manifest = [
    "# Cleanroom Input Manifest",
    "",
    "One-way snapshot generated by `scripts/sync-cleanroom-input.cjs` in the",
    "source repo. Do not edit files under `cleanroom-input/` by hand; refresh",
    "by re-running the sync, which records a new snapshot here.",
    "",
    `- Source repo: dnd (private)`,
    `- Source commit SHA: ${sourceSha}`,
    `- Copy date: ${new Date().toISOString()}`,
    `- Files: ${inventory.length}`,
    "",
    "Cleanroom tasks must declare which source commit SHA they implement",
    "against (this manifest's SHA at the time the task starts).",
    "",
    "## Included",
    "",
    "- `raw/srd-5.2.1/**`: SRD 5.2.1 RAW markdown.",
    "- `qnt/**`: active QNT specs, MBT drivers, and rule-core slices.",
    "- `domain/UBIQUITOUS_LANGUAGE.md`: domain language.",
    "- `domain/CLEANROOM_ASSUMPTIONS.md`: curated RAW-ambiguity decisions.",
    "",
    "## Excluded",
    "",
    "- production TypeScript implementation code and tests;",
    "- generated JS/TS bridge code;",
    "- prior cleanroom attempts;",
    "- MBT traces and generated matrices;",
    "- source-repo plans, work logs, and agent instructions.",
    "",
    "If needed behavior cannot be derived from this corpus, record a blocker",
    "instead of guessing.",
    "",
    "## Counts",
    "",
    ...[...counts.entries()].map(([top, count]) => `- \`${top}\`: ${count}`),
    "",
    "## Per-File Inventory",
    "",
    "| File | sha256 | Source path |",
    "| --- | --- | --- |",
    ...inventory.map(
      (item) => `| \`${item.dest}\` | \`${item.sha256}\` | \`${item.source}\` |`,
    ),
    "",
  ].join("\n");

  fs.writeFileSync(path.join(inputRoot, "MANIFEST.md"), manifest);
  process.stdout.write(
    `synced ${inventory.length} files to ${inputRoot} at source SHA ${sourceSha} ` +
      `(${importsChecked} QNT imports resolved)\n`,
  );
}

main();
