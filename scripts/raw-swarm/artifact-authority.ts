import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { Either, Schema } from "effect";

import {
  ArtifactAuthoritySchema,
  type ArtifactAuthority,
} from "./artifact-authority-schema.ts";
import {
  canonicalRepositoryReadPath,
  canonicalRunnerOwnedReadPath,
} from "./repository-path.ts";
import { repoRoot } from "./transcript.ts";

export { ArtifactAuthoritySchema };
export type { ArtifactAuthority };

function fail(message: string): never {
  throw new Error(message);
}

function repositoryReadPath(path: string): string {
  const canonical = canonicalRepositoryReadPath(repoRoot, path);
  if (Either.isLeft(canonical)) {
    fail(`Artifact is not repository-owned: ${path}: ${canonical.left}`);
  }
  return canonical.right;
}

export function artifactAuthority(path: string): ArtifactAuthority {
  const absolutePath = repositoryReadPath(path);
  const repositoryPath = relative(repoRoot, absolutePath);
  const bytes = readFileSync(absolutePath);
  return artifactAuthorityForBytes(repositoryPath, bytes);
}

export function artifactAuthorityForBytes(
  path: string,
  bytes: Uint8Array,
): ArtifactAuthority {
  return Schema.decodeUnknownSync(ArtifactAuthoritySchema)({
    path,
    byteLength: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}

function readJsonLinesAtPath(
  absolutePath: string,
  reportedPath: string,
): readonly unknown[] {
  const text = (() => {
    try {
      return readFileSync(absolutePath, "utf8");
    } catch {
      return fail(`Artifact is unreadable or missing: ${reportedPath}`);
    }
  })();
  return text
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line, index): unknown => {
      try {
        return JSON.parse(line);
      } catch {
        return fail(`${reportedPath}:${index + 1} is malformed JSONL.`);
      }
    });
}

export function readJsonLines(path: string): readonly unknown[] {
  return readJsonLinesAtPath(repositoryReadPath(path), path);
}

export function readRunnerOwnedJsonLines(
  runnerRoot: string,
  path: string,
): readonly unknown[] {
  const canonical = canonicalRunnerOwnedReadPath(runnerRoot, path);
  if (Either.isLeft(canonical)) {
    return fail(`Artifact is not runner-owned: ${path}: ${canonical.left}`);
  }
  return readJsonLinesAtPath(canonical.right, path);
}
