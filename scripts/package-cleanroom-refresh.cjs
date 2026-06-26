#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");

function fail(message) {
  process.stderr.write(`package-cleanroom-refresh: ${message}\n`);
  process.exit(1);
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    fail(`${name} requires a value`);
  }
  return value;
}

function git(...args) {
  return execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
  }).trim();
}

function requireCleanScaffold() {
  const checked = [
    "plans/cleanroom-scaffolds",
    "scripts/sync-cleanroom-input.cjs",
    "scripts/render-cleanroom-scaffold.cjs",
    "scripts/package-cleanroom-refresh.cjs",
    "scripts/check-cleanroom-harness.cjs",
    "scripts/cleanroom-branch-coverage-check.cjs",
  ];
  const status = git("status", "--porcelain", "--", ...checked);
  if (status !== "") {
    fail(
      "cleanroom scaffold packaging inputs have uncommitted changes; commit " +
        `them first so the package is reproducible:\n${status}`,
    );
  }
}

function sha256File(filePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

function runNode(scriptPath, args) {
  execFileSync(process.execPath, [path.join(root, scriptPath), ...args], {
    cwd: root,
    stdio: "inherit",
  });
}

function validateArchive(archivePath) {
  const required = new Set([
    "./AGENTS.md",
    "./BOOTSTRAP_QUERY.md",
    "./README.md",
    "./target-profile.json",
    "./tasks/WORK_LOOP.md",
    "./tasks/LEVEL_1_2_SCOPE.md",
    "./tasks/IMPLEMENTER_TASK.md",
    "./tasks/TARGET_REPLAY_EVIDENCE.example.json",
    "./tasks/VALIDATION_REPORT.md",
    "./scripts/check-cleanroom-harness.cjs",
    "./scripts/cleanroom-branch-coverage-check.cjs",
    "./cleanroom-input/MANIFEST.md",
    "./cleanroom-input/branch-coverage/source-branch-inventory.json",
    "./cleanroom-input/branch-coverage/reducer-route-inventory.json",
  ]);
  const listing = execFileSync("tar", ["-tzf", archivePath], {
    encoding: "utf8",
  })
    .trim()
    .split("\n");
  for (const entry of listing) required.delete(entry);
  if (required.size > 0) {
    fail(`archive is missing required entries:\n${[...required].join("\n")}`);
  }
}

function main() {
  const profileArg = argValue("--profile");
  if (profileArg === undefined) {
    fail(
      "usage: package-cleanroom-refresh --profile <json> [--output <tar.gz>] " +
        "[--allow-dirty-scaffold]",
    );
  }
  const allowDirtyScaffold = process.argv.includes("--allow-dirty-scaffold");
  if (!allowDirtyScaffold) requireCleanScaffold();

  const profilePath = path.resolve(root, profileArg);
  if (!fs.existsSync(profilePath)) {
    fail(`target profile does not exist: ${profileArg}`);
  }

  const sourceSha = git("rev-parse", "HEAD");
  const outputPath = path.resolve(
    argValue("--output") ??
      path.join(
        path.dirname(root),
        `dnd-cleanroom-refresh-${sourceSha.slice(0, 8)}.tar.gz`,
      ),
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.rmSync(outputPath, { force: true });
  fs.rmSync(`${outputPath}.sha256`, { force: true });

  const stage = fs.mkdtempSync(path.join(os.tmpdir(), "cleanroom-refresh-"));
  try {
    runNode("scripts/sync-cleanroom-input.cjs", ["--target", stage]);
    runNode("scripts/render-cleanroom-scaffold.cjs", [
      "--profile",
      profilePath,
      "--target",
      stage,
    ]);
    execFileSync("tar", ["-C", stage, "-czf", outputPath, "."], {
      cwd: root,
      stdio: "inherit",
    });
    validateArchive(outputPath);
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
  }

  const archiveSha = sha256File(outputPath);
  fs.writeFileSync(`${outputPath}.sha256`, `${archiveSha}  ${outputPath}\n`);
  process.stdout.write(`archive: ${outputPath}\n`);
  process.stdout.write(`sha256:  ${archiveSha}\n`);
  process.stdout.write(`source:  ${sourceSha}\n`);
}

main();
