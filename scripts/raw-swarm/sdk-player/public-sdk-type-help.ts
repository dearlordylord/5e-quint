import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const PUBLIC_SDK_TYPE_HELP_ENTRY_MAX_BYTES = 80 * 1024;
export const PUBLIC_SDK_TYPE_HELP_ARTIFACT_MAX_BYTES = 160 * 1024;

export type PublicSdkTypeHelpEntry = {
  readonly fillKind: string;
  readonly declaration: string;
  readonly byteLength: number;
};

export type PublicSdkTypeHelpArtifact = {
  readonly schemaVersion: 1;
  readonly declarationGraphSha256: string;
  readonly entriesSha256: string;
  readonly entries: readonly PublicSdkTypeHelpEntry[];
};

export type PublicSdkTypeHelpResult =
  | { readonly tag: "found"; readonly declaration: string }
  | { readonly tag: "invalidArtifact"; readonly message: string }
  | { readonly tag: "unknownFillKind"; readonly message: string };

function declarationFiles(directory: string): readonly string[] {
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".d.ts"))
    .map((entry) => resolve(entry.parentPath, entry.name))
    .sort();
}

export function publicSdkDeclarationGraphSha256(
  declarationsDirectory: string,
): string | undefined {
  const files = declarationFiles(declarationsDirectory);
  if (files.length === 0) return undefined;
  const hash = createHash("sha256");
  for (const path of files) {
    hash.update(path.slice(declarationsDirectory.length + 1));
    hash.update("\0");
    hash.update(readFileSync(path));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function entryBytes(entry: PublicSdkTypeHelpEntry): string {
  return `${entry.fillKind}\0${String(entry.byteLength)}\0${entry.declaration}\0`;
}

export function publicSdkTypeHelpEntriesSha256(
  entries: readonly PublicSdkTypeHelpEntry[],
): string {
  const hash = createHash("sha256");
  for (const entry of entries) hash.update(entryBytes(entry));
  return hash.digest("hex");
}

function parsedArtifact(value: unknown): PublicSdkTypeHelpArtifact | string {
  if (
    typeof value !== "object" ||
    value === null ||
    !("schemaVersion" in value) ||
    value.schemaVersion !== 1 ||
    !("declarationGraphSha256" in value) ||
    typeof value.declarationGraphSha256 !== "string" ||
    !/^[0-9a-f]{64}$/.test(value.declarationGraphSha256) ||
    !("entriesSha256" in value) ||
    typeof value.entriesSha256 !== "string" ||
    !/^[0-9a-f]{64}$/.test(value.entriesSha256) ||
    !("entries" in value) ||
    !Array.isArray(value.entries)
  ) {
    return "Public SDK type-help artifact has an invalid envelope.";
  }
  const fillKinds = new Set<string>();
  const entries: PublicSdkTypeHelpEntry[] = [];
  let totalEntryBytes = 0;
  for (const entry of value.entries) {
    if (
      typeof entry !== "object" ||
      entry === null ||
      !("fillKind" in entry) ||
      typeof entry.fillKind !== "string" ||
      !/^[A-Za-z][A-Za-z0-9]*$/.test(entry.fillKind) ||
      !("declaration" in entry) ||
      typeof entry.declaration !== "string" ||
      !("byteLength" in entry) ||
      typeof entry.byteLength !== "number" ||
      Buffer.byteLength(entry.declaration, "utf8") !== entry.byteLength ||
      entry.byteLength > PUBLIC_SDK_TYPE_HELP_ENTRY_MAX_BYTES
    ) {
      return "Public SDK type-help artifact has an invalid entry.";
    }
    if (fillKinds.has(entry.fillKind)) {
      return `Public SDK type-help artifact repeats ${entry.fillKind}.`;
    }
    fillKinds.add(entry.fillKind);
    totalEntryBytes += entry.byteLength;
    if (totalEntryBytes > PUBLIC_SDK_TYPE_HELP_ARTIFACT_MAX_BYTES) {
      return "Public SDK type-help artifact exceeds its total byte limit.";
    }
    entries.push({
      fillKind: entry.fillKind,
      declaration: entry.declaration,
      byteLength: entry.byteLength,
    });
  }
  if (publicSdkTypeHelpEntriesSha256(entries) !== value.entriesSha256) {
    return "Public SDK type-help entries hash does not match.";
  }
  return {
    schemaVersion: 1,
    declarationGraphSha256: value.declarationGraphSha256,
    entriesSha256: value.entriesSha256,
    entries,
  };
}

export function publicSdkTypeHelp(
  artifact: unknown,
  fillKind: string,
  declarationGraphSha256: string,
): PublicSdkTypeHelpResult {
  const parsed = parsedArtifact(artifact);
  if (typeof parsed === "string") {
    return { tag: "invalidArtifact", message: parsed };
  }
  const accepted = parsed;
  if (declarationGraphSha256 !== accepted.declarationGraphSha256) {
    return {
      tag: "invalidArtifact",
      message: "Public SDK type-help declaration graph hash does not match.",
    };
  }
  const entry = accepted.entries.find(
    (candidate) => candidate.fillKind === fillKind,
  );
  return entry === undefined
    ? {
        tag: "unknownFillKind",
        message: `Unknown BattleFill kind: ${fillKind}.`,
      }
    : { tag: "found", declaration: entry.declaration };
}
