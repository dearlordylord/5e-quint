import { readFileSync, readdirSync, rmSync, mkdtempSync } from "node:fs";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

import { Either, Schema } from "effect";

import {
  formatSurfaceDecodeError,
  StatBlockRecordSchema,
  UnitRecordSchema,
} from "../packages/surface/src/surface/schema.ts";
import {
  SRD_SURFACE_PUBLICATION_FILE_NAMES,
  SRD_SURFACE_SCHEMA_BOUNDS,
  SRD_SURFACE_SCHEMA_SIZE,
  SURFACE_PUBLICATION_MEMBERS,
  SURFACE_SCHEMA_BOUND_MEASURES,
} from "../packages/surface/src/surface/publication-artifacts.ts";
import dhallJsonToolchain from "../packages/surface/dhall-json-toolchain.json" with { type: "json" };
import { buildSrdSurfacePublication } from "./srd-surface-publication-artifacts.ts";

export type PublicationIssue =
  | {
      readonly kind: "missing-json";
      readonly source: string;
      readonly peer: string;
    }
  | { readonly kind: "orphaned-json"; readonly peer: string }
  | {
      readonly kind: "out-of-sync-json";
      readonly source: string;
      readonly peer: string;
    }
  | {
      readonly kind: "compile-failed";
      readonly source: string;
      readonly message: string;
    }
  | {
      readonly kind: "decode-failed";
      readonly file: string;
      readonly message: string;
    }
  | { readonly kind: "missing-publication-artifact"; readonly file: string }
  | {
      readonly kind: "out-of-sync-publication-artifact";
      readonly file: string;
    }
  | {
      readonly kind: "unreadable-publication-artifact";
      readonly file: string;
      readonly message: string;
    }
  | {
      readonly kind: "publication-schema-bound-exceeded";
      readonly measure: keyof typeof SRD_SURFACE_SCHEMA_BOUNDS;
      readonly actual: number;
      readonly limit: number;
    }
  | {
      readonly kind: "publication-generation-failed";
      readonly recordId: string;
      readonly section: string;
      readonly reason: "invalid-locator" | "empty-excerpt" | "invalid-excerpt";
    };

type JsonDocument = unknown;

export type PublicationCheckOptions = {
  readonly repoRoot: string;
  readonly contentDir: string;
  readonly publicationDir?: string;
  readonly compile: (
    sourcePath: string,
    outputPath: string,
  ) => string | undefined;
};

export type PublicationCheckResult = {
  readonly issues: readonly PublicationIssue[];
  readonly sourceCount: number;
  readonly peerCount: number;
};

export function checkDhallJsonCompilerVersion(
  versionOutput: string,
): string | undefined {
  const installedVersion = versionOutput.trim();
  return installedVersion === dhallJsonToolchain.dhallJsonVersion
    ? undefined
    : `dhall-to-json ${dhallJsonToolchain.dhallJsonVersion} is required for byte-exact Surface publication; found ${installedVersion || "an empty version"}.`;
}

function repoPath(repoRoot: string, filePath: string): string {
  return relative(repoRoot, filePath).split("\\").join("/");
}

function contentFiles(
  contentDir: string,
  extension: string,
): readonly string[] {
  return readdirSync(contentDir)
    .filter((name) => name.endsWith(extension))
    .sort();
}

function canonicalDhallFiles(contentDir: string): readonly string[] {
  // Files beginning with `_` are Dhall authoring helpers, not authored records.
  // This source-shape convention keeps discovery closed under new record kinds.
  return contentFiles(contentDir, ".dhall").filter(
    (name) => !name.startsWith("_"),
  );
}

function compileDhallToJson(
  sourcePath: string,
  outputPath: string,
): string | undefined {
  const result = spawnSync(
    "dhall-to-json",
    ["--omit-empty", "--file", sourcePath, "--output", outputPath],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );

  if (result.error || result.status !== 0) {
    return (
      [result.error?.message, result.stderr?.trim()]
        .filter((message): message is string => Boolean(message))
        .join("\n") || "dhall-to-json exited unsuccessfully"
    );
  }

  return undefined;
}

function readJson(
  filePath: string,
):
  | { readonly tag: "ok"; readonly value: JsonDocument }
  | { readonly tag: "invalid"; readonly message: string } {
  try {
    return {
      tag: "ok",
      value: JSON.parse(readFileSync(filePath, "utf8")),
    };
  } catch (error) {
    return {
      tag: "invalid",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

const MAX_DECODE_DIAGNOSTIC_CHARS = 4000;

function decodeRecord(value: unknown): string | undefined {
  const isStatBlock =
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "kind" in value &&
    value.kind === "statBlock";
  const diagnostic = isStatBlock
    ? (() => {
        const decoded = Schema.decodeUnknownEither(StatBlockRecordSchema, {
          onExcessProperty: "error",
        })(value);
        return Either.isRight(decoded)
          ? undefined
          : formatSurfaceDecodeError(decoded.left);
      })()
    : (() => {
        const decoded = Schema.decodeUnknownEither(UnitRecordSchema, {
          onExcessProperty: "error",
        })(value);
        return Either.isRight(decoded)
          ? undefined
          : formatSurfaceDecodeError(decoded.left);
      })();

  if (diagnostic === undefined) return undefined;

  const lines = diagnostic.split("\n");
  const limited = lines.slice(0, 14).join("\n");
  return limited.length > MAX_DECODE_DIAGNOSTIC_CHARS
    ? `${limited.slice(0, MAX_DECODE_DIAGNOSTIC_CHARS)}\n...decode diagnostic truncated`
    : lines.length > 14
      ? `${limited}\n...decode diagnostic truncated`
      : limited;
}

function decodeDocument(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    const error = decodeRecord(value);
    return error === undefined ? [] : [error];
  }

  if (value.length === 0) {
    return ["expected a non-empty record collection"];
  }

  const first = value[0];
  const expectedKind =
    typeof first === "object" &&
    first !== null &&
    !Array.isArray(first) &&
    "kind" in first
      ? first.kind
      : undefined;
  const errors: string[] = [];

  value.forEach((entry, index) => {
    const actualKind =
      typeof entry === "object" &&
      entry !== null &&
      !Array.isArray(entry) &&
      "kind" in entry
        ? entry.kind
        : undefined;
    if (actualKind !== expectedKind) {
      errors.push(
        `entry ${index}: record family differs from entry 0 (expected ${String(expectedKind)}, got ${String(actualKind)})`,
      );
    }
    const error = decodeRecord(entry);
    if (error !== undefined) {
      errors.push(`entry ${index}: ${error}`);
    }
  });

  return errors;
}

function addDecodeIssues(
  issues: PublicationIssue[],
  displayFile: string,
  value: unknown,
  context: string,
): void {
  for (const message of decodeDocument(value)) {
    issues.push({
      kind: "decode-failed",
      file: displayFile,
      message: `${context}: ${message}`,
    });
  }
}

function checkJsonFile(
  issues: PublicationIssue[],
  filePath: string,
  displayFile: string,
  context: string,
): void {
  const parsed = readJson(filePath);
  if (parsed.tag === "invalid") {
    issues.push({
      kind: "decode-failed",
      file: displayFile,
      message: `${context}: invalid JSON: ${parsed.message}`,
    });
    return;
  }
  addDecodeIssues(issues, displayFile, parsed.value, context);
}

type PublicationArtifactReadResult =
  | { readonly tag: "ok"; readonly bytes: Buffer }
  | { readonly tag: "missing" }
  | { readonly tag: "unreadable"; readonly message: string };

function readPublicationArtifact(
  filePath: string,
): PublicationArtifactReadResult {
  try {
    return { tag: "ok", bytes: readFileSync(filePath) };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return { tag: "missing" };
    }
    return {
      tag: "unreadable",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function checkSurfacePublicationArtifacts(
  issues: PublicationIssue[],
  repoRoot: string,
  publicationDir: string,
): void {
  const publication = buildSrdSurfacePublication();
  if (publication.tag === "invalid") {
    issues.push(
      ...publication.issues.map((issue) => ({
        kind: "publication-generation-failed" as const,
        recordId: issue.recordId,
        section: issue.section,
        reason: issue.reason,
      })),
    );
    return;
  }

  for (const member of SURFACE_PUBLICATION_MEMBERS) {
    const fileName = SRD_SURFACE_PUBLICATION_FILE_NAMES[member];
    const filePath = join(publicationDir, fileName);
    const displayFile = repoPath(repoRoot, filePath);
    const committed = readPublicationArtifact(filePath);
    if (committed.tag === "missing") {
      issues.push({ kind: "missing-publication-artifact", file: displayFile });
      continue;
    }
    if (committed.tag === "unreadable") {
      issues.push({
        kind: "unreadable-publication-artifact",
        file: displayFile,
        message: committed.message,
      });
      continue;
    }

    if (!committed.bytes.equals(publication.bytes[member])) {
      issues.push({
        kind: "out-of-sync-publication-artifact",
        file: displayFile,
      });
    }
  }

  for (const measure of SURFACE_SCHEMA_BOUND_MEASURES) {
    const actual = SRD_SURFACE_SCHEMA_SIZE[measure];
    const limit = SRD_SURFACE_SCHEMA_BOUNDS[measure];
    if (actual >= limit) {
      issues.push({
        kind: "publication-schema-bound-exceeded",
        measure,
        actual,
        limit,
      });
    }
  }
}

export function runPublicationCheck(
  options: PublicationCheckOptions,
): PublicationCheckResult {
  const { repoRoot, contentDir, compile } = options;
  const sources = canonicalDhallFiles(contentDir);
  const peers = contentFiles(contentDir, ".json");
  const sourcePeers = new Set(
    sources.map((source) => source.replace(/\.dhall$/, ".json")),
  );
  const issues: PublicationIssue[] = [];
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "surface-json-sync-"));

  try {
    for (const source of sources) {
      const peer = source.replace(/\.dhall$/, ".json");
      const sourcePath = join(contentDir, source);
      const peerPath = join(contentDir, peer);
      const generatedPath = join(temporaryDirectory, peer);

      if (!peers.includes(peer)) {
        issues.push({
          kind: "missing-json",
          source: repoPath(repoRoot, sourcePath),
          peer: repoPath(repoRoot, peerPath),
        });
      }

      const compileError = compile(sourcePath, generatedPath);
      if (compileError !== undefined) {
        issues.push({
          kind: "compile-failed",
          source: repoPath(repoRoot, sourcePath),
          message: compileError,
        });
      } else {
        checkJsonFile(
          issues,
          generatedPath,
          repoPath(repoRoot, peerPath),
          `generated from ${repoPath(repoRoot, sourcePath)}`,
        );
        if (peers.includes(peer)) {
          const generated = readFileSync(generatedPath);
          const committed = readFileSync(peerPath);
          if (!generated.equals(committed)) {
            issues.push({
              kind: "out-of-sync-json",
              source: repoPath(repoRoot, sourcePath),
              peer: repoPath(repoRoot, peerPath),
            });
          }
        }
      }

      if (peers.includes(peer)) {
        checkJsonFile(
          issues,
          peerPath,
          repoPath(repoRoot, peerPath),
          `committed peer for ${repoPath(repoRoot, sourcePath)}`,
        );
      }
    }

    for (const peer of peers) {
      if (sourcePeers.has(peer)) continue;
      const peerPath = join(contentDir, peer);
      issues.push({
        kind: "orphaned-json",
        peer: repoPath(repoRoot, peerPath),
      });
      checkJsonFile(
        issues,
        peerPath,
        repoPath(repoRoot, peerPath),
        "orphaned JSON",
      );
    }
  } finally {
    rmSync(temporaryDirectory, { force: true, recursive: true });
  }

  if (options.publicationDir !== undefined) {
    checkSurfacePublicationArtifacts(issues, repoRoot, options.publicationDir);
  }

  return { issues, sourceCount: sources.length, peerCount: peers.length };
}

function main(): void {
  const repoRoot = process.cwd();
  const contentDir = join(repoRoot, "packages", "surface", "content");
  const compiler = spawnSync("dhall-to-json", ["--version"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (compiler.error || compiler.status !== 0) {
    console.error(
      "dhall-to-json is required to verify Surface content JSON sync.",
    );
    process.exitCode = 1;
    return;
  }
  const compilerVersionIssue = checkDhallJsonCompilerVersion(compiler.stdout);
  if (compilerVersionIssue !== undefined) {
    console.error(compilerVersionIssue);
    process.exitCode = 1;
    return;
  }

  const { issues, sourceCount, peerCount } = runPublicationCheck({
    repoRoot,
    contentDir,
    publicationDir: join(repoRoot, "packages", "surface", "publication"),
    compile: compileDhallToJson,
  });

  if (issues.length > 0) {
    console.error(
      "Surface content publication failed: every canonical Dhall source must have a deterministic, strictly decodable JSON peer.",
    );
    for (const issue of issues) {
      if (issue.kind === "missing-json") {
        console.error(`- missing-json: ${issue.source} -> ${issue.peer}`);
      } else if (issue.kind === "orphaned-json") {
        console.error(`- orphaned-json: ${issue.peer}`);
      } else if (issue.kind === "out-of-sync-json") {
        console.error(`- out-of-sync-json: ${issue.peer} from ${issue.source}`);
      } else if (issue.kind === "compile-failed") {
        console.error(`- compile-failed: ${issue.source}\n${issue.message}`);
      } else if (issue.kind === "decode-failed") {
        console.error(`- decode-failed: ${issue.file}\n${issue.message}`);
      } else if (issue.kind === "missing-publication-artifact") {
        console.error(`- missing-publication-artifact: ${issue.file}`);
      } else if (issue.kind === "out-of-sync-publication-artifact") {
        console.error(`- out-of-sync-publication-artifact: ${issue.file}`);
      } else if (issue.kind === "unreadable-publication-artifact") {
        console.error(
          `- unreadable-publication-artifact: ${issue.file}\n${issue.message}`,
        );
      } else if (issue.kind === "publication-generation-failed") {
        console.error(
          `- publication-generation-failed: ${issue.recordId}: ${issue.reason}: ${issue.section}`,
        );
      } else {
        console.error(
          `- publication-schema-bound-exceeded: ${issue.measure} ${issue.actual} >= ${issue.limit}`,
        );
      }
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Surface content publication passed: ${sourceCount} canonical Dhall sources and ${peerCount} generated JSON peers decoded and synchronized.`,
  );
}

if (process.argv[1]?.endsWith("check-surface-content-json-sync.ts") === true) {
  main();
}
