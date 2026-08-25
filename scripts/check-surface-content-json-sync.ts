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
import {
  buildSrdSurfacePublication,
  describeSurfacePublicationBuildIssue,
  type SurfacePublicationExcerptSource,
  type SurfacePublicationBuildIssue,
} from "./srd-surface-publication-artifacts.ts";
import {
  readSrdStatBlockParity,
  type SrdStatBlockParityReport,
} from "./srd521-stat-block-parity.ts";
import {
  projectSrdStatBlockPeerObservation,
  type SurfacePublicationPeerObservation,
  type SurfacePublicationRecordKind,
} from "./surface-publication-peer-observations.ts";
import { srdSurface } from "../packages/surface/src/surface/surface-catalog.ts";

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
      readonly issue: SurfacePublicationBuildIssue;
    };

type JsonDocument = unknown;

export type PublicationCheckOptions = {
  readonly repoRoot: string;
  readonly contentDir: string;
  readonly publicationDir?: string;
  readonly publicationExcerptSource?: SurfacePublicationExcerptSource;
  readonly compile: (
    sourcePath: string,
    outputPath: string,
  ) => string | undefined;
};

export type PublicationCheckResult = {
  readonly issues: readonly PublicationIssue[];
  readonly sourceCount: number;
  readonly peerCount: number;
  /** Every generated peer state observed by this content-sync owner. */
  readonly generatedPeerObservations: readonly SurfacePublicationPeerObservation[];
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
  | { readonly tag: "unreadable"; readonly message: string }
  | { readonly tag: "invalid"; readonly message: string } {
  let contents: string;
  try {
    contents = readFileSync(filePath, "utf8");
  } catch (error) {
    return {
      tag: "unreadable",
      message: error instanceof Error ? error.message : String(error),
    };
  }
  try {
    return { tag: "ok", value: JSON.parse(contents) };
  } catch (error) {
    return {
      tag: "invalid",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function surfacePublicationRecordKind(
  value: unknown,
): SurfacePublicationRecordKind {
  const values = Array.isArray(value) ? value : [value];
  if (values.length === 0) return "unknown";
  const kinds = values.map((entry) => {
    if (
      typeof entry !== "object" ||
      entry === null ||
      Array.isArray(entry) ||
      !("kind" in entry)
    ) {
      return "unknown" as const;
    }
    return entry.kind === "statBlock" ? ("statBlock" as const) : "other";
  });
  const first = kinds[0];
  return first !== undefined && kinds.every((kind) => kind === first)
    ? first
    : "unknown";
}

function sourceRecordKind(sourcePath: string): SurfacePublicationRecordKind {
  try {
    const contents = readFileSync(sourcePath, "utf8");
    const kind = /\bkind\s*=\s*"([^"]+)"/.exec(contents)?.[1];
    return kind === undefined
      ? "unknown"
      : kind === "statBlock"
        ? "statBlock"
        : "other";
  } catch {
    return "unknown";
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

type JsonInspection =
  | {
      readonly tag: "ok";
      readonly value: JsonDocument;
      readonly recordKind: SurfacePublicationRecordKind;
    }
  | {
      readonly tag: "failed";
      readonly reason: "decode" | "read";
      readonly recordKind: SurfacePublicationRecordKind;
      readonly message: string;
    };

function inspectJsonFile(
  issues: PublicationIssue[],
  filePath: string,
  displayFile: string,
  context: string,
  fallbackRecordKind: SurfacePublicationRecordKind,
): JsonInspection {
  const parsed = readJson(filePath);
  if (parsed.tag === "unreadable") {
    const message = `${context}: file could not be read: ${parsed.message}`;
    issues.push({
      kind: "decode-failed",
      file: displayFile,
      message,
    });
    return {
      tag: "failed",
      reason: "read",
      recordKind: fallbackRecordKind,
      message,
    };
  }
  if (parsed.tag === "invalid") {
    const message = `${context}: invalid JSON: ${parsed.message}`;
    issues.push({ kind: "decode-failed", file: displayFile, message });
    return {
      tag: "failed",
      reason: "decode",
      recordKind: fallbackRecordKind,
      message,
    };
  }
  const recordKind = surfacePublicationRecordKind(parsed.value);
  const decodeMessages = decodeDocument(parsed.value);
  for (const message of decodeMessages) {
    issues.push({
      kind: "decode-failed",
      file: displayFile,
      message: `${context}: ${message}`,
    });
  }
  if (decodeMessages.length > 0) {
    return {
      tag: "failed",
      reason: "decode",
      recordKind: recordKind === "unknown" ? fallbackRecordKind : recordKind,
      message: decodeMessages
        .map((message) => `${context}: ${message}`)
        .join("\n"),
    };
  }
  return { tag: "ok", value: parsed.value, recordKind };
}

type PeerBytesResult =
  | { readonly tag: "ok"; readonly bytes: Buffer }
  | { readonly tag: "unreadable"; readonly message: string };

function readPeerBytes(filePath: string): PeerBytesResult {
  try {
    return { tag: "ok", bytes: readFileSync(filePath) };
  } catch (error) {
    return {
      tag: "unreadable",
      message: error instanceof Error ? error.message : String(error),
    };
  }
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
  excerptSource?: SurfacePublicationExcerptSource,
): void {
  const publication =
    excerptSource === undefined
      ? buildSrdSurfacePublication()
      : buildSrdSurfacePublication({ excerptSource });
  if (publication.tag === "invalid") {
    issues.push(
      ...publication.issues.map((issue) => ({
        kind: "publication-generation-failed" as const,
        issue,
      })),
    );
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

    if (
      publication.tag === "ok" &&
      !committed.bytes.equals(publication.bytes[member])
    ) {
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
  const generatedPeerObservations: SurfacePublicationPeerObservation[] = [];
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "surface-json-sync-"));

  try {
    for (const source of sources) {
      const peer = source.replace(/\.dhall$/, ".json");
      const sourcePath = join(contentDir, source);
      const peerPath = join(contentDir, peer);
      const generatedPath = join(temporaryDirectory, peer);
      const displaySource = repoPath(repoRoot, sourcePath);
      const displayPeer = repoPath(repoRoot, peerPath);
      const peerExists = peers.includes(peer);
      const sourceKind = sourceRecordKind(sourcePath);
      let peerIsHealthy = peerExists;

      if (!peerExists) {
        issues.push({
          kind: "missing-json",
          source: displaySource,
          peer: displayPeer,
        });
        generatedPeerObservations.push({
          tag: "missing",
          recordKind: sourceKind,
          sourcePath: displaySource,
          peerPath: displayPeer,
        });
      }

      const compileError = compile(sourcePath, generatedPath);
      let generatedInspection: JsonInspection | undefined;
      if (compileError !== undefined) {
        peerIsHealthy = false;
        issues.push({
          kind: "compile-failed",
          source: displaySource,
          message: compileError,
        });
        generatedPeerObservations.push({
          tag: "source-failed",
          reason: "compile",
          recordKind: sourceKind,
          sourcePath: displaySource,
          peerPath: displayPeer,
          message: `Dhall compilation failed: ${compileError}`,
        });
      } else {
        generatedInspection = inspectJsonFile(
          issues,
          generatedPath,
          displayPeer,
          `generated from ${displaySource}`,
          sourceKind,
        );
        if (generatedInspection.tag === "failed") {
          peerIsHealthy = false;
          generatedPeerObservations.push({
            tag: "generated-peer-failed",
            reason: generatedInspection.reason,
            recordKind: generatedInspection.recordKind,
            sourcePath: displaySource,
            peerPath: displayPeer,
            message: generatedInspection.message,
          });
        }
      }

      let committedInspection: JsonInspection | undefined;
      if (peerExists) {
        const generatedKind =
          generatedInspection?.recordKind === undefined ||
          generatedInspection.recordKind === "unknown"
            ? sourceKind
            : generatedInspection.recordKind;
        committedInspection = inspectJsonFile(
          issues,
          peerPath,
          displayPeer,
          `committed peer for ${displaySource}`,
          generatedKind,
        );
        if (committedInspection.tag === "failed") {
          peerIsHealthy = false;
          generatedPeerObservations.push({
            tag: "committed-peer-failed",
            reason: committedInspection.reason,
            recordKind: committedInspection.recordKind,
            sourcePath: displaySource,
            peerPath: displayPeer,
            message: committedInspection.message,
          });
        }

        if (
          generatedInspection?.tag === "ok" &&
          committedInspection.tag === "ok"
        ) {
          const generated = readPeerBytes(generatedPath);
          const committed = readPeerBytes(peerPath);
          if (generated.tag === "unreadable") {
            peerIsHealthy = false;
            generatedPeerObservations.push({
              tag: "generated-peer-failed",
              reason: "read",
              recordKind: generatedInspection.recordKind,
              sourcePath: displaySource,
              peerPath: displayPeer,
              message: `Generated peer could not be read: ${generated.message}`,
            });
          } else if (committed.tag === "unreadable") {
            peerIsHealthy = false;
            generatedPeerObservations.push({
              tag: "committed-peer-failed",
              reason: "read",
              recordKind: committedInspection.recordKind,
              sourcePath: displaySource,
              peerPath: displayPeer,
              message: `Committed peer could not be read: ${committed.message}`,
            });
          } else if (!generated.bytes.equals(committed.bytes)) {
            peerIsHealthy = false;
            issues.push({
              kind: "out-of-sync-json",
              source: displaySource,
              peer: displayPeer,
            });
            generatedPeerObservations.push({
              tag: "out-of-sync",
              recordKind: generatedInspection.recordKind,
              sourcePath: displaySource,
              peerPath: displayPeer,
            });
          }
        }
      }

      if (peerIsHealthy) {
        generatedPeerObservations.push({
          tag: "present",
          recordKind:
            committedInspection?.tag === "ok"
              ? committedInspection.recordKind
              : generatedInspection?.tag === "ok"
                ? generatedInspection.recordKind
                : sourceKind,
          sourcePath: displaySource,
          peerPath: displayPeer,
        });
      }
    }

    for (const peer of peers) {
      if (sourcePeers.has(peer)) continue;
      const peerPath = join(contentDir, peer);
      const displayPeer = repoPath(repoRoot, peerPath);
      issues.push({
        kind: "orphaned-json",
        peer: displayPeer,
      });
      const peerInspection = inspectJsonFile(
        issues,
        peerPath,
        displayPeer,
        "orphaned JSON",
        "unknown",
      );
      const recordKind = peerInspection.recordKind;
      generatedPeerObservations.push({
        tag: "orphaned",
        recordKind,
        peerPath: displayPeer,
      });
      if (peerInspection.tag === "failed") {
        generatedPeerObservations.push({
          tag: "orphaned-peer-failed",
          reason: peerInspection.reason,
          recordKind: peerInspection.recordKind,
          peerPath: displayPeer,
          message: peerInspection.message,
        });
      }
    }
  } finally {
    rmSync(temporaryDirectory, { force: true, recursive: true });
  }

  if (options.publicationDir !== undefined) {
    checkSurfacePublicationArtifacts(
      issues,
      repoRoot,
      options.publicationDir,
      options.publicationExcerptSource,
    );
  }

  return {
    issues,
    sourceCount: sources.length,
    peerCount: peers.length,
    generatedPeerObservations,
  };
}

export type SurfacePublicationCheckResult = PublicationCheckResult & {
  /** Source-derived stat-block parity is reported beside, not merged into, sync acceptance. */
  readonly statBlockParity: SrdStatBlockParityReport;
};

export function runSurfacePublicationCheck(
  options: PublicationCheckOptions,
): SurfacePublicationCheckResult {
  const publication = runPublicationCheck(options);
  const statBlockParity = readSrdStatBlockParity({
    repoRoot: options.repoRoot,
    installedStatBlocks: srdSurface.statBlocks,
    generatedPeerObservations: publication.generatedPeerObservations.flatMap(
      (observation) => {
        const projected = projectSrdStatBlockPeerObservation(observation);
        return projected === undefined ? [] : [projected];
      },
    ),
  });
  return { ...publication, statBlockParity };
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

  const { issues, sourceCount, peerCount, statBlockParity } =
    runSurfacePublicationCheck({
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
          `- publication-generation-failed: ${describeSurfacePublicationBuildIssue(issue.issue)}`,
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
  console.log(
    `SRD stat-block parity report: ${statBlockParity.discovery.occurrences.length} source occurrences, ${statBlockParity.discovery.identities.length} source identities, ${statBlockParity.issues.length} report issues; parity acceptance remains a separate operation.`,
  );
}

if (process.argv[1]?.endsWith("check-surface-content-json-sync.ts") === true) {
  main();
}
