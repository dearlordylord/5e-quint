import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { repositoryArtifactPath } from "./artifact-index.ts";
import type { ArtifactAuthority } from "./artifact-authority-schema.ts";
import { repoRoot } from "./transcript.ts";

export { ArtifactAuthoritySchema } from "./artifact-authority-schema.ts";
export type { ArtifactAuthority } from "./artifact-authority-schema.ts";

function fail(message: string): never {
  throw new Error(message);
}

export function artifactAuthority(path: string): ArtifactAuthority {
  const repositoryPath = repositoryArtifactPath(path);
  const bytes = readFileSync(resolve(repoRoot, repositoryPath));
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
  const text = (() => {
    try {
      return readFileSync(resolve(repoRoot, path), "utf8");
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
