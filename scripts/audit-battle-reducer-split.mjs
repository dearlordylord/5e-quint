#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "..");
const reducerPath = "packages/battle-runtime/src/battle-reducer.ts";
const splitDirPath = "packages/battle-runtime/src/battle-reducer";
const baseRef = process.argv[2] ?? "master";

function findAncestorGitDir(start) {
  let cursor = start;
  while (true) {
    const candidate = path.join(cursor, ".git");
    if (existsSync(candidate)) {
      try {
        if (readdirSync(candidate)) {
          return candidate;
        }
      } catch {
        // A worktree .git file can point at a host path that does not exist in
        // this container. Keep walking upward to find the real common .git dir.
      }
    }

    const parent = path.dirname(cursor);
    if (parent === cursor) {
      return null;
    }
    cursor = parent;
  }
}

function readBaseReducer() {
  const commonGitDir = findAncestorGitDir(path.dirname(repoRoot));
  const env = commonGitDir === null ? process.env : { ...process.env, GIT_DIR: commonGitDir };
  return execFileSync("git", ["show", `${baseRef}:${reducerPath}`], {
    cwd: repoRoot,
    env,
    encoding: "utf8",
  });
}

function currentReducerFiles() {
  const reducerFile = path.join(repoRoot, reducerPath);
  const splitDir = path.join(repoRoot, splitDirPath);
  const files = [reducerFile];
  if (existsSync(splitDir)) {
    for (const name of readdirSync(splitDir).sort()) {
      if (name.endsWith(".ts")) {
        files.push(path.join(splitDir, name));
      }
    }
  }
  return files;
}

function extractFunctionImplementations(source, file) {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const implementations = [];

  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.body !== undefined && node.name !== undefined) {
      const text = source.slice(node.getStart(sourceFile), node.end);
      const normalized = text
        .replace(/^export\s+/, "")
        .replace(/\s+/g, " ")
        .trim();
      const hash = createHash("sha256").update(normalized).digest("hex").slice(0, 16);
      implementations.push({
        name: node.name.text,
        file: path.relative(repoRoot, file),
        hash,
        lines: text.split("\n").length,
      });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return implementations;
}
function byName(implementations) {
  const groups = new Map();
  for (const implementation of implementations) {
    const group = groups.get(implementation.name) ?? [];
    group.push(implementation);
    groups.set(implementation.name, group);
  }
  return groups;
}

function exportedBarrelModules() {
  const splitDir = path.join(repoRoot, splitDirPath);
  const indexFile = path.join(splitDir, "index.ts");
  if (!existsSync(splitDir) || !existsSync(indexFile)) {
    return { missingFromBarrel: [], barrelPointsAtMissing: [] };
  }

  const indexSource = readFileSync(indexFile, "utf8");
  const barrelExports = [...indexSource.matchAll(/from\s+"\.\/([^"]+)"/g)]
    .map((match) => match[1])
    .sort();
  const tsFiles = readdirSync(splitDir)
    .filter((name) => name.endsWith(".ts") && name !== "index.ts")
    .sort();

  return {
    missingFromBarrel: tsFiles.filter((file) => !barrelExports.includes(file)),
    barrelPointsAtMissing: barrelExports.filter((file) => !tsFiles.includes(file)),
  };
}

function location(implementation) {
  return `${implementation.file}:${implementation.lines}l:${implementation.hash}`;
}

const baseImplementations = extractFunctionImplementations(
  readBaseReducer(),
  path.join(repoRoot, reducerPath),
);
const currentImplementations = currentReducerFiles().flatMap((file) =>
  extractFunctionImplementations(readFileSync(file, "utf8"), file),
);

const baseByName = byName(baseImplementations);
const currentByName = byName(currentImplementations);
const missing = [];
const changed = [];
const duplicated = [];
const added = [];

for (const [name, baseGroup] of baseByName) {
  const currentGroup = currentByName.get(name) ?? [];
  if (currentGroup.length === 0) {
    missing.push({ name, base: baseGroup.map(location) });
    continue;
  }

  const baseHashes = new Set(baseGroup.map((implementation) => implementation.hash));
  const currentHashes = new Set(currentGroup.map((implementation) => implementation.hash));
  const hasMatchingImplementation = [...baseHashes].some((hash) =>
    currentHashes.has(hash),
  );

  if (!hasMatchingImplementation) {
    changed.push({
      name,
      base: baseGroup.map(location),
      current: currentGroup.map(location),
    });
  }

  if (currentGroup.length > baseGroup.length) {
    duplicated.push({
      name,
      base: baseGroup.map(location),
      current: currentGroup.map(location),
    });
  }
}

for (const [name, currentGroup] of currentByName) {
  if (!baseByName.has(name)) {
    added.push({ name, current: currentGroup.map(location) });
  }
}

const report = {
  baseRef,
  reducerPath,
  splitDirPath,
  implementations: {
    base: baseImplementations.length,
    current: currentImplementations.length,
    missing,
    duplicated,
    added,
    changed,
  },
  barrel: exportedBarrelModules(),
};

console.log(JSON.stringify(report, null, 2));

const failed =
  missing.length > 0 ||
  duplicated.length > 0 ||
  added.length > 0 ||
  report.barrel.missingFromBarrel.length > 0 ||
  report.barrel.barrelPointsAtMissing.length > 0;

process.exitCode = failed ? 1 : 0;
