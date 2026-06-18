#!/usr/bin/env node
"use strict";

// One-way, allowlist-enforced sync of the cleanroom input corpus.
//
// Run from the source repo root. Wipes <target>/cleanroom-input/ and rebuilds
// it from the allowlist below, then writes cleanroom-input/MANIFEST.md with
// the source commit SHA, copy date, and a per-file sha256 inventory. Cleanroom
// tasks declare which source commit SHA from the manifest they implement
// against.
//
// Usage: node scripts/sync-cleanroom-input.cjs [--target <path>] [--dry-run]

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const DEFAULT_TARGET = "/workspace/typescript/dnd-cleanroom-target";

// Allowlist for the language-independent cleanroom input corpus. Each rule
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
    sourceRoot: "plans/cleanroom-branch-coverage/source-branch-inventory.json",
    destRoot: "branch-coverage/source-branch-inventory.json",
    kind: "file",
    transform: "source-branch-inventory-cleanroom-paths",
  },
  {
    sourceRoot: "plans/cleanroom-branch-coverage/reducer-route-inventory.json",
    destRoot: "branch-coverage/reducer-route-inventory.json",
    kind: "file",
    transform: "cleanroom-paths",
  },
  {
    sourceRoot: "plans/cleanroom-guidance",
    destRoot: "guidance",
    kind: "tree",
    extension: ".md",
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
  const args = { target: DEFAULT_TARGET, dryRun: false, selfTest: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--target") {
      i += 1;
      if (!argv[i]) fail("--target requires a path");
      args.target = argv[i];
    } else if (argv[i] === "--dry-run") {
      args.dryRun = true;
    } else if (argv[i] === "--self-test") {
      args.selfTest = true;
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
      copies.push({
        source: rule.sourceRoot,
        dest: destRoot,
        transform: rule.transform,
      });
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
          transform: rule.transform,
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
        dangling.push(
          `${item.dest}: from "${importPath}" -> missing ${target}`,
        );
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

function verifyBranchInventoryHashes(targetRoot, inputRoot) {
  const inventoryPath = path.join(
    inputRoot,
    "branch-coverage/source-branch-inventory.json",
  );
  if (!fs.existsSync(inventoryPath)) {
    fail("source branch inventory was not copied.");
  }
  const sourceInventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
  const entries = [
    ...(sourceInventory.branchObligations ?? []),
    ...(sourceInventory.sampledInputs ?? []),
  ];
  const checked = new Set();
  const issues = [];
  for (const entry of entries) {
    if (typeof entry.driverPath !== "string") {
      issues.push("branch inventory entry is missing driverPath.");
      continue;
    }
    if (checked.has(entry.driverPath)) continue;
    checked.add(entry.driverPath);
    const driverPath = path.join(targetRoot, entry.driverPath);
    if (!fs.existsSync(driverPath)) {
      issues.push(`${entry.driverPath}: copied QNT driver is missing.`);
      continue;
    }
    const actual = sha256(driverPath);
    if (actual !== entry.qntFileSha256) {
      issues.push(
        `${entry.driverPath}: qntFileSha256 ${entry.qntFileSha256} does not match copied file ${actual}.`,
      );
    }
  }
  if (issues.length > 0) {
    fail(`source branch inventory hash check failed:\n${issues.join("\n")}`);
  }
  return checked.size;
}

function requireCleanSources(repoRoot) {
  const roots = ALLOWLIST.map((rule) => rule.sourceRoot);
  const status = git(repoRoot, "status", "--porcelain", "--", ...roots);
  if (status !== "") {
    fail(
      `allowlisted sources have uncommitted changes; commit them first so the manifest source commit SHA is truthful:\n${status}`,
    );
  }
}

function sha256(filePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

const VALIDATOR_FILES = [
  "scripts/check-cleanroom-harness.cjs",
  "scripts/cleanroom-branch-coverage-check.cjs",
];

function cleanroomQntPath(sourceDriverPath) {
  if (!sourceDriverPath.startsWith("packages/")) return sourceDriverPath;
  return path.join(
    "cleanroom-input/qnt",
    sourceDriverPath.slice("packages/".length),
  );
}

function transformSourceBranchInventory(content) {
  const inventory = JSON.parse(content);
  const transformEntry = (entry) => {
    const driverPath = cleanroomQntPath(entry.driverPath);
    const transformed = {
      ...entry,
      driverPath,
    };
    if (typeof entry.obligationId === "string") {
      transformed.obligationId = entry.obligationId.replace(
        entry.driverPath,
        driverPath,
      );
    }
    return transformed;
  };
  return `${JSON.stringify(
    {
      ...inventory,
      sourceArtifacts: {
        ...inventory.sourceArtifacts,
        branchScope:
          "materialized in branchObligations; source branch-scope rows are not copied to cleanroom input",
        driverPathModel: "cleanroom-input/qnt paths",
      },
      branchObligations: (inventory.branchObligations ?? []).map(
        transformEntry,
      ),
      sampledInputs: (inventory.sampledInputs ?? []).map(transformEntry),
    },
    null,
    2,
  )}\n`;
}

function cleanroomPathString(value) {
  if (value.startsWith("packages/")) return cleanroomQntPath(value);
  return value;
}

function cleanroomPathValue(value) {
  if (typeof value === "string") return cleanroomPathString(value);
  if (Array.isArray(value)) return value.map(cleanroomPathValue);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        cleanroomPathValue(entry),
      ]),
    );
  }
  return value;
}

function transformCleanroomPaths(content) {
  return `${JSON.stringify(cleanroomPathValue(JSON.parse(content)), null, 2)}\n`;
}

function runSelfTest() {
  const copies = collectCopies(path.resolve(__dirname, ".."));
  const inventoryCopy = copies.find(
    (copy) => copy.dest === "branch-coverage/source-branch-inventory.json",
  );
  const routeInventoryCopy = copies.find(
    (copy) => copy.dest === "branch-coverage/reducer-route-inventory.json",
  );
  if (
    inventoryCopy === undefined ||
    inventoryCopy.transform !== "source-branch-inventory-cleanroom-paths"
  ) {
    fail(
      "source branch inventory copy must preserve its cleanroom path transform.",
    );
  }
  if (
    routeInventoryCopy === undefined ||
    routeInventoryCopy.transform !== "cleanroom-paths"
  ) {
    fail(
      "reducer route inventory copy must preserve its cleanroom path transform.",
    );
  }
  const transformed = JSON.parse(
    transformSourceBranchInventory(
      JSON.stringify({
        sourceArtifacts: {
          branchScope: "plans/cleanroom-branch-coverage/branch-scope.jsonl",
        },
        branchObligations: [
          {
            driverPath: "packages/example/example.mbt.qnt",
            obligationId: "packages/example/example.mbt.qnt#step:doThing",
          },
        ],
        sampledInputs: [
          {
            driverPath: "packages/example/example.mbt.qnt",
            branchFamily: "step",
            branchAction: "doThing",
          },
        ],
      }),
    ),
  );
  const transformedRoutes = JSON.parse(
    transformCleanroomPaths(
      JSON.stringify({
        diagnosticBatches: [
          {
            entries: [
              {
                driverPath: "packages/example/example.mbt.qnt",
                derivability: {
                  qntFacts: ["packages/example/example.mbt.qnt"],
                },
              },
            ],
          },
        ],
      }),
    ),
  );
  if (
    transformed.branchObligations[0].driverPath !==
      "cleanroom-input/qnt/example/example.mbt.qnt" ||
    transformed.branchObligations[0].obligationId !==
      "cleanroom-input/qnt/example/example.mbt.qnt#step:doThing" ||
    transformed.sampledInputs[0].driverPath !==
      "cleanroom-input/qnt/example/example.mbt.qnt" ||
    transformed.sourceArtifacts.branchScope.includes("plans/")
  ) {
    fail(
      "source branch inventory transform did not produce target-local paths.",
    );
  }
  if (
    transformedRoutes.diagnosticBatches[0].entries[0].driverPath !==
      "cleanroom-input/qnt/example/example.mbt.qnt" ||
    transformedRoutes.diagnosticBatches[0].entries[0].derivability
      .qntFacts[0] !== "cleanroom-input/qnt/example/example.mbt.qnt"
  ) {
    fail(
      "reducer route inventory transform did not produce target-local paths.",
    );
  }
  process.stdout.write("cleanroom input sync self-test OK.\n");
}

function transformedContent(copy, sourceAbs) {
  const content = fs.readFileSync(sourceAbs, "utf8");
  if (copy.transform === "source-branch-inventory-cleanroom-paths") {
    return transformSourceBranchInventory(content);
  }
  if (copy.transform === "cleanroom-paths") {
    return transformCleanroomPaths(content);
  }
  return content;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = path.resolve(__dirname, "..");
  if (args.selfTest) {
    runSelfTest();
    return;
  }
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

  requireCleanSources(repoRoot);
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
    if (copy.transform) {
      fs.writeFileSync(destAbs, transformedContent(copy, sourceAbs));
    } else {
      fs.copyFileSync(sourceAbs, destAbs);
    }
    inventory.push({
      dest: copy.dest,
      source: copy.source,
      sha256: sha256(destAbs),
    });
  }

  const importsChecked = verifyImportsResolve(inputRoot, inventory);
  const branchInventoryDriversChecked = verifyBranchInventoryHashes(
    args.target,
    inputRoot,
  );

  const counts = new Map();
  for (const item of inventory) {
    const top = item.dest.split("/").slice(0, 2).join("/");
    counts.set(top, (counts.get(top) ?? 0) + 1);
  }
  const validatorInventory = VALIDATOR_FILES.map((relativePath) => ({
    path: relativePath,
    sha256: sha256(path.join(repoRoot, relativePath)),
  }));

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
    "against (the `Source commit SHA` recorded here at task start).",
    "Source-side rechecks must resolve validators from this source commit and",
    "compare target-local copied validators against the hashes below.",
    "",
    "## Included",
    "",
    "- `raw/srd-5.2.1/**`: SRD 5.2.1 RAW markdown.",
    "- `qnt/**`: active QNT specs, MBT drivers, and rule-core slices.",
    "- `branch-coverage/source-branch-inventory.json`: source branch obligations.",
    "- `branch-coverage/reducer-route-inventory.json`: source reducer-route task selection.",
    "- `guidance/**`: curated source-side cleanroom guidance.",
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
      (item) =>
        `| \`${item.dest}\` | \`${item.sha256}\` | \`${item.source}\` |`,
    ),
    "",
    "## Validator Snapshot",
    "",
    "| File | sha256 |",
    "| --- | --- |",
    ...validatorInventory.map(
      (item) => `| \`${item.path}\` | \`${item.sha256}\` |`,
    ),
    "",
  ].join("\n");

  fs.writeFileSync(path.join(inputRoot, "MANIFEST.md"), manifest);
  process.stdout.write(
    `synced ${inventory.length} files to ${inputRoot} at source SHA ${sourceSha} ` +
      `(${importsChecked} QNT imports resolved, ${branchInventoryDriversChecked} branch-inventory drivers checked)\n`,
  );
}

main();
