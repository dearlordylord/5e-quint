#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const skippedDirectories = new Set([
  ".ralph",
  ".git",
  ".turbo",
  ".worktrees",
  "dist",
  "node_modules",
]);

const runBlockPattern = /^[ \t]*run\s+[A-Za-z_][A-Za-z0-9_]*\b/m;
const ownerMarkerPattern =
  /(?:RAW-COVERAGE|KERNEL-COVERAGE|UNIT-PROFILE-COVERAGE):\s+(?:qnt-owner|verification-owner:qnt-proof)\b/;

function isQntTestModule(relativePath) {
  const basename = path.basename(relativePath);
  return (
    basename.endsWith(".mbt.qnt") ||
    /(?:-|_)tests?\.qnt$/.test(basename) ||
    /(?:-|_)examples?\.qnt$/.test(basename) ||
    /(?:-|_)proof-runner\.qnt$/.test(basename)
  );
}

function collectQntPaths(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    if (skippedDirectories.has(entry.name)) return [];
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectQntPaths(absolutePath);
    if (!entry.isFile() || !entry.name.endsWith(".qnt")) return [];
    return [path.relative(root, absolutePath).split(path.sep).join("/")];
  });
}

const findings = collectQntPaths(root)
  .filter((relativePath) => !isQntTestModule(relativePath))
  .flatMap((relativePath) => {
    const source = fs.readFileSync(path.join(root, relativePath), "utf8");
    if (!ownerMarkerPattern.test(source) || !runBlockPattern.test(source)) {
      return [];
    }
    return [relativePath];
  })
  .sort((left, right) => left.localeCompare(right));

if (findings.length > 0) {
  console.error(
    "QNT run-block separation check failed. Move run blocks out of owner " +
      "modules into explicit test/example/MBT/proof-runner modules:",
  );
  for (const finding of findings) console.error(`  - ${finding}`);
  process.exit(1);
}

console.log("QNT run-block separation check passed.");
