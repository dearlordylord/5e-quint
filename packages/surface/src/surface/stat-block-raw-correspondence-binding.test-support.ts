import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SRD_RAW_ROOT = fileURLToPath(
  new URL("../../../../.references/srd-5.2.1/", import.meta.url),
);
const SOURCE_PATTERN = /^(.+):([1-9][0-9]*)-([1-9][0-9]*)$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

export type ParsedRawCorrespondenceSource = {
  readonly path: string;
  readonly lineStart: number;
  readonly lineEnd: number;
};

export type RawCorrespondenceBinding =
  | {
      readonly tag: "bound";
      readonly source: string;
      readonly path: string;
      readonly lineStart: number;
      readonly lineEnd: number;
      readonly heading: string;
      readonly sha256: string;
    }
  | {
      readonly tag: "invalid";
      readonly source: string;
      readonly reason:
        | "malformed-source"
        | "unsupported-path"
        | "unreadable-source"
        | "span-bounds"
        | "header-mismatch"
        | "invalid-digest"
        | "digest-mismatch";
      readonly message: string;
    };

export type RawCorrespondenceBindingInput = {
  readonly source: string;
  readonly expectedName: string;
  readonly expectedSha256: string;
  readonly readFile?: (absolutePath: string) => string;
};

type RawCorrespondenceSourceRead =
  | { readonly tag: "read"; readonly contents: string }
  | { readonly tag: "unreadable"; readonly message: string };

function readRawCorrespondenceSource(
  readFile: (absolutePath: string) => string,
  absolutePath: string,
): RawCorrespondenceSourceRead {
  try {
    return { tag: "read", contents: readFile(absolutePath) };
  } catch (error) {
    return {
      tag: "unreadable",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export function parseRawCorrespondenceSource(
  source: string,
): ParsedRawCorrespondenceSource | undefined {
  const match = SOURCE_PATTERN.exec(source);
  if (match === null) return undefined;

  const lineStart = Number(match[2]);
  const lineEnd = Number(match[3]);
  if (!Number.isSafeInteger(lineStart) || !Number.isSafeInteger(lineEnd)) {
    return undefined;
  }
  if (lineStart > lineEnd) return undefined;

  return { path: match[1], lineStart, lineEnd };
}

/**
 * Binds a correspondence expectation to its exact local line span. The
 * digest is SHA-256 over the citation followed by a NUL byte and the span's
 * source text; it proves byte/text identity, not semantic interpretation.
 */
export function bindRawCorrespondence(
  input: RawCorrespondenceBindingInput,
): RawCorrespondenceBinding {
  const parsed = parseRawCorrespondenceSource(input.source);
  if (parsed === undefined) {
    return {
      tag: "invalid",
      source: input.source,
      reason: "malformed-source",
      message: "Expected path:start-end with positive inclusive line bounds.",
    };
  }

  if (
    parsed.path.startsWith("/") ||
    parsed.path.includes("\\") ||
    parsed.path
      .split("/")
      .some(
        (segment) =>
          segment.length === 0 || segment === "." || segment === "..",
      )
  ) {
    return {
      tag: "invalid",
      source: input.source,
      reason: "unsupported-path",
      message: `Source path must be a normalized relative path inside the SRD corpus: ${parsed.path}`,
    };
  }

  const absolutePath = resolve(SRD_RAW_ROOT, parsed.path);
  const relativePath = relative(SRD_RAW_ROOT, absolutePath);
  if (
    relativePath.length === 0 ||
    isAbsolute(relativePath) ||
    relativePath === ".." ||
    relativePath.startsWith("../")
  ) {
    return {
      tag: "invalid",
      source: input.source,
      reason: "unsupported-path",
      message: `Source path resolves outside the SRD corpus: ${parsed.path}`,
    };
  }

  const readFile =
    input.readFile ?? ((path: string) => readFileSync(path, "utf8"));
  const sourceRead = readRawCorrespondenceSource(readFile, absolutePath);
  if (sourceRead.tag === "unreadable") {
    return {
      tag: "invalid",
      source: input.source,
      reason: "unreadable-source",
      message: `Unable to read ${parsed.path}: ${sourceRead.message}`,
    };
  }
  const contents = sourceRead.contents;

  const lineStarts = [0];
  for (let index = contents.indexOf("\n"); index !== -1; ) {
    lineStarts.push(index + 1);
    index = contents.indexOf("\n", index + 1);
  }
  const lineCount =
    contents.length === 0
      ? 0
      : lineStarts.length - (contents.endsWith("\n") ? 1 : 0);
  if (parsed.lineEnd > lineCount) {
    return {
      tag: "invalid",
      source: input.source,
      reason: "span-bounds",
      message: `Span ${parsed.lineStart}-${parsed.lineEnd} exceeds ${parsed.path}'s ${lineCount} lines.`,
    };
  }

  const spanStart = lineStarts[parsed.lineStart - 1];
  const spanEnd =
    parsed.lineEnd < lineCount ? lineStarts[parsed.lineEnd] : contents.length;
  const span = contents.slice(spanStart, spanEnd);
  const firstLineEnd = span.indexOf("\n");
  const heading = (
    firstLineEnd === -1 ? span : span.slice(0, firstLineEnd)
  ).replace(/\r$/, "");
  if (
    heading !== `## ${input.expectedName}` &&
    heading !== `### ${input.expectedName}`
  ) {
    return {
      tag: "invalid",
      source: input.source,
      reason: "header-mismatch",
      message: `Span must begin with ## or ### ${input.expectedName}; found ${heading || "<empty>"}.`,
    };
  }

  if (!SHA256_PATTERN.test(input.expectedSha256)) {
    return {
      tag: "invalid",
      source: input.source,
      reason: "invalid-digest",
      message: "Expected a lowercase SHA-256 digest.",
    };
  }
  const sha256 = createHash("sha256")
    .update(input.source, "utf8")
    .update("\0", "utf8")
    .update(span, "utf8")
    .digest("hex");
  if (sha256 !== input.expectedSha256) {
    return {
      tag: "invalid",
      source: input.source,
      reason: "digest-mismatch",
      message: `Expected ${input.expectedSha256}; found ${sha256}.`,
    };
  }

  return {
    tag: "bound",
    source: input.source,
    path: parsed.path,
    lineStart: parsed.lineStart,
    lineEnd: parsed.lineEnd,
    heading,
    sha256,
  };
}
