#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const workspacePath = path.join(repoRoot, "pnpm-workspace.yaml");
const activePackageDirs = readWorkspacePackageDirs(workspacePath);
const failures = [];
const quarantinedPackageDirs = ["packages/core", "packages/v0"];
const quarantinedPackageNames = ["@dnd/core", "@dnd/v0"];

if (fs.existsSync(path.join(repoRoot, "packages", "core"))) {
  failures.push("packages/core must not exist; v0 restore-source material lives in packages/v0.");
}

for (const packageDir of quarantinedPackageDirs) {
  if (activePackageDirs.includes(packageDir)) {
    failures.push(`pnpm-workspace.yaml must not include ${packageDir}.`);
  }
}

const rootPackageJson = readJson(path.join(repoRoot, "package.json"));
for (const [scriptName, script] of Object.entries(rootPackageJson.scripts ?? {})) {
  for (const packageName of quarantinedPackageNames) {
    if (script.includes(packageName)) {
      failures.push(`root package.json script ${scriptName} references ${packageName}.`);
    }
  }
}

for (const packageDir of activePackageDirs) {
  if (quarantinedPackageDirs.includes(packageDir)) continue;

  const absolutePackageDir = path.join(repoRoot, packageDir);
  const packageJsonPath = path.join(absolutePackageDir, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    failures.push(`workspace package is missing package.json: ${packageDir}`);
    continue;
  }

  const packageJson = readJson(packageJsonPath);
  for (const dependencyField of [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ]) {
    for (const packageName of quarantinedPackageNames) {
      if (packageJson[dependencyField]?.[packageName] !== undefined) {
        failures.push(`${packageDir}/package.json declares ${dependencyField}.${packageName}.`);
      }
    }
  }

  const sourceDir = path.join(absolutePackageDir, "src");
  if (fs.existsSync(sourceDir)) {
    for (const sourceFile of walkSourceFiles(sourceDir)) {
      checkSourceFile(sourceFile, failures);
    }
  }
}

if (failures.length > 0) {
  console.error("v0 quarantine boundary failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
}

function readWorkspacePackageDirs(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const packageDirs = [];
  for (const line of text.split(/\r?\n/u)) {
    const match = line.match(/^\s*-\s*["']?([^"'\s]+)["']?\s*$/u);
    if (match !== null) {
      packageDirs.push(match[1]);
    }
  }
  return packageDirs;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function walkSourceFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!["dist", "build", "node_modules"].includes(entry.name)) {
        files.push(...walkSourceFiles(absolutePath));
      }
      continue;
    }
    if (/\.(?:ts|tsx|mts|cts)$/u.test(entry.name)) {
      files.push(absolutePath);
    }
  }
  return files;
}

function checkSourceFile(filePath, failures) {
  const source = fs.readFileSync(filePath, "utf8");
  const importSpecifiers = [
    ...source.matchAll(/\bfrom\s+["']([^"']+)["']/gu),
    ...source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/gu),
    ...source.matchAll(/\brequire\s*\(\s*["']([^"']+)["']\s*\)/gu),
  ].map((match) => match[1]);

  for (const specifier of importSpecifiers) {
    for (const packageName of quarantinedPackageNames) {
      if (specifier === packageName || specifier.startsWith(`${packageName}/`)) {
        failures.push(`${relative(filePath)} imports ${specifier}.`);
        continue;
      }
    }

    if (specifier.startsWith(".")) {
      const resolved = path.resolve(path.dirname(filePath), specifier);
      const relativeResolved = relative(resolved);
      if (
        relativeResolved === "packages/core" ||
        relativeResolved.startsWith("packages/core/") ||
        relativeResolved === "packages/v0" ||
        relativeResolved.startsWith("packages/v0/")
      ) {
        failures.push(`${relative(filePath)} reaches into ${relativeResolved}.`);
      }
    }
  }
}

function relative(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, "/");
}
