#!/usr/bin/env node

const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const repoRoot = process.cwd();
const contentDir = path.join(repoRoot, "packages", "surface", "content");

const CLASS_RECORD_PATTERN = /^class_.*\.dhall$/;

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function contentFiles(extension) {
  return fs
    .readdirSync(contentDir)
    .filter((name) => name.endsWith(extension))
    .sort();
}

function assertDhallCompilerAvailable() {
  const result = childProcess.spawnSync("dhall-to-json", ["--version"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error || result.status !== 0) {
    fail(
      [
        "dhall-to-json is required to verify Surface content JSON sync.",
        "Install the Dhall compiler, then run this check again.",
      ].join("\n"),
    );
    process.exit();
  }
}

function compileDhallToJson(dhallPath, jsonPath) {
  const result = childProcess.spawnSync(
    "dhall-to-json",
    ["--omit-empty", "--file", dhallPath, "--output", jsonPath],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  if (result.error || result.status !== 0) {
    const stderr = result.stderr.trim();
    throw new Error(
      [`Failed to compile ${path.relative(repoRoot, dhallPath)}.`, stderr]
        .filter(Boolean)
        .join("\n"),
    );
  }
}

assertDhallCompilerAvailable();

const dhallFiles = contentFiles(".dhall").filter((name) =>
  CLASS_RECORD_PATTERN.test(name),
);
const jsonFiles = new Set(contentFiles(".json"));
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "surface-json-sync-"));
const mismatches = [];

try {
  for (const dhallFile of dhallFiles) {
    const jsonFile = dhallFile.replace(/\.dhall$/, ".json");
    const dhallPath = path.join(contentDir, dhallFile);
    const committedJsonPath = path.join(contentDir, jsonFile);
    const generatedJsonPath = path.join(tempDir, jsonFile);

    if (!jsonFiles.has(jsonFile)) {
      mismatches.push({
        kind: "missing-json",
        file: path.relative(repoRoot, committedJsonPath),
      });
      continue;
    }

    try {
      compileDhallToJson(dhallPath, generatedJsonPath);
    } catch (error) {
      mismatches.push({
        kind: "compile-failed",
        file: path.relative(repoRoot, dhallPath),
        message: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    if (
      !fs
        .readFileSync(committedJsonPath)
        .equals(fs.readFileSync(generatedJsonPath))
    ) {
      mismatches.push({
        kind: "out-of-sync-json",
        file: path.relative(repoRoot, committedJsonPath),
        source: path.relative(repoRoot, dhallPath),
      });
    }
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  fs.rmSync(tempDir, { force: true, recursive: true });
}

if (mismatches.length > 0) {
  console.error(
    "Surface class content JSON is not generated from matching Dhall source.",
  );
  for (const mismatch of mismatches.slice(0, 20)) {
    if (mismatch.kind === "missing-json") {
      console.error(`- Missing generated JSON: ${mismatch.file}`);
    } else if (mismatch.kind === "compile-failed") {
      console.error(`- Dhall compile failed: ${mismatch.file}`);
      console.error(mismatch.message);
    } else {
      console.error(`- Out of sync: ${mismatch.file} from ${mismatch.source}`);
    }
  }
  if (mismatches.length > 20) {
    console.error(`- ...and ${mismatches.length - 20} more`);
  }
  console.error("");
  console.error("Regenerate changed content with:");
  console.error(
    "  dhall-to-json --omit-empty --file packages/surface/content/<slug>.dhall --output packages/surface/content/<slug>.json",
  );
  process.exitCode = 1;
}
