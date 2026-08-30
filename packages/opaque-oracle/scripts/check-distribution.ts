import { lstatSync, readFileSync, readdirSync, type Dirent } from "node:fs";
import { builtinModules } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { Result } from "effect";

import {
  loadOracleApplicationFromDirectory,
  ORACLE_DISTRIBUTION_FILE_NAMES,
} from "../src/oracle-distribution.ts";
import {
  ORACLE_PUBLICATION_FILE_NAMES,
  ORACLE_PUBLICATION_MEMBERS,
} from "../src/oracle-publication.ts";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultDirectory = resolve(packageRoot, "dist");
const expectedFiles = new Set<string>([
  ORACLE_DISTRIBUTION_FILE_NAMES.executable,
  ORACLE_DISTRIBUTION_FILE_NAMES.identity,
  ORACLE_DISTRIBUTION_FILE_NAMES.projection,
  ...ORACLE_PUBLICATION_MEMBERS.map(
    (member) => ORACLE_PUBLICATION_FILE_NAMES[member],
  ),
]);

export type OracleDistributionCheckIssue =
  | { readonly tag: "missingDirectory" }
  | { readonly tag: "unexpectedFile"; readonly path: string }
  | { readonly tag: "symbolicLink"; readonly path: string }
  | { readonly tag: "nonFile"; readonly path: string }
  | { readonly tag: "sourceLeak"; readonly path: string }
  | { readonly tag: "sourceMapLeak"; readonly path: string }
  | { readonly tag: "repositoryPathLeak"; readonly path: string }
  | { readonly tag: "unresolvedImport"; readonly specifier: string }
  | { readonly tag: "applicationRejected"; readonly message: string };

/** Check the exact source-free distribution tree and its runtime identity. */
export function checkOracleDistribution(
  directory: string = defaultDirectory,
): Result.Result<true, OracleDistributionCheckIssue> {
  const root = resolve(directory);
  let entries: readonly Dirent[];
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return Result.fail({ tag: "missingDirectory" });
  }
  for (const entry of entries) {
    const path = resolve(root, entry.name);
    if (entry.isSymbolicLink())
      return Result.fail({ tag: "symbolicLink", path });
    if (!entry.isFile()) return Result.fail({ tag: "nonFile", path });
    if (!expectedFiles.has(entry.name)) {
      return Result.fail({ tag: "unexpectedFile", path });
    }
    const sourceIssue = inspectBytes(path);
    if (sourceIssue !== undefined) return Result.fail(sourceIssue);
  }
  for (const name of expectedFiles) {
    if (!entries.some((entry) => entry.name === name)) {
      return Result.fail({
        tag: "applicationRejected",
        message: `missing ${name}`,
      });
    }
  }

  const executablePath = resolve(
    root,
    ORACLE_DISTRIBUTION_FILE_NAMES.executable,
  );
  const executable = readFileSync(executablePath, "utf8");
  for (const marker of [
    "packages/surface/content/",
    "surface/content/",
    "unit-catalog-data.ts",
    "stat-block-catalog-data.ts",
  ]) {
    if (executable.includes(marker)) {
      return Result.fail({
        tag: "sourceLeak",
        path: `${executablePath} contains ${marker}`,
      });
    }
  }
  const importIssue = inspectImports(executable);
  if (importIssue !== undefined) return Result.fail(importIssue);
  const repositoryRoot = resolve(packageRoot, "../..");
  if (executable.includes(repositoryRoot)) {
    return Result.fail({ tag: "repositoryPathLeak", path: executablePath });
  }
  const stat = lstatSync(executablePath);
  if ((stat.mode & 0o111) === 0) {
    return Result.fail({
      tag: "applicationRejected",
      message: "executable is not executable",
    });
  }

  const application = loadOracleApplicationFromDirectory({ directory: root });
  return Result.isFailure(application)
    ? Result.fail({
        tag: "applicationRejected",
        message: application.failure.tag,
      })
    : Result.succeed(true);
}

function inspectBytes(path: string): OracleDistributionCheckIssue | undefined {
  const lower = path.toLowerCase();
  if (
    lower.endsWith(".ts") ||
    lower.endsWith(".tsx") ||
    lower.endsWith(".d.ts") ||
    lower.endsWith(".map")
  ) {
    return { tag: "sourceLeak", path };
  }
  const bytes = readFileSync(path);
  const text = bytes.toString("utf8");
  if (text.includes("sourceMappingURL")) {
    return { tag: "sourceMapLeak", path };
  }
  return undefined;
}

function inspectImports(
  text: string,
): OracleDistributionCheckIssue | undefined {
  const importPattern =
    /\bfrom\s*["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)/gu;
  for (const match of text.matchAll(importPattern)) {
    const specifier = match[1] ?? match[2];
    if (specifier === undefined || isBuiltinSpecifier(specifier)) continue;
    return { tag: "unresolvedImport", specifier };
  }
  return undefined;
}

function isBuiltinSpecifier(specifier: string): boolean {
  return (
    specifier.startsWith("node:") ||
    builtinModules.includes(specifier) ||
    specifier === "assert/strict"
  );
}

function runCli(): void {
  const directory = process.argv[2] ?? defaultDirectory;
  const result = checkOracleDistribution(directory);
  if (Result.isFailure(result)) {
    throw new Error(JSON.stringify(result.failure));
  }
  process.stdout.write(
    `opaque-oracle distribution check passed: ${resolve(directory)}\n`,
  );
}

const invokedScript = process.argv[1];
if (
  invokedScript !== undefined &&
  pathToFileURL(invokedScript).href === import.meta.url
) {
  try {
    runCli();
  } catch (cause) {
    process.stderr.write(
      `opaque-oracle distribution check failed: ${String(cause)}\n`,
    );
    process.exitCode = 1;
  }
}
