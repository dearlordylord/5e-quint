import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { Either } from "effect";

import type { ArtifactAuthority } from "./artifact-authority-schema.ts";
import { canonicalRepositoryReadPath } from "./repository-path.ts";
import { repoRoot } from "./transcript.ts";

export { ArtifactAuthoritySchema } from "./artifact-authority-schema.ts";
export type { ArtifactAuthority } from "./artifact-authority-schema.ts";

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
  return {
    path,
    byteLength: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

export function readJsonLines(path: string): readonly unknown[] {
  const absolutePath = repositoryReadPath(path);
  const text = (() => {
    try {
      return readFileSync(absolutePath, "utf8");
    } catch {
      return fail(`Artifact is unreadable or missing: ${path}`);
    }
  })();
  return text
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line, index): unknown => {
      try {
        return JSON.parse(line);
      } catch {
        return fail(`${path}:${index + 1} is malformed JSONL.`);
      }
    });
}
