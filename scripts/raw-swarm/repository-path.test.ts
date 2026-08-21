import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { Either } from "effect";
import { expect, test } from "vitest";

import {
  canonicalRepositoryOutputPath,
  canonicalRepositoryReadPath,
} from "./repository-path.ts";

test("rejects an in-repository symlink authority that resolves outside", () => {
  const root = mkdtempSync(resolve(tmpdir(), "raw-swarm-path-"));
  const outside = mkdtempSync(resolve(tmpdir(), "raw-swarm-outside-"));
  try {
    mkdirSync(resolve(root, "authorities"));
    writeFileSync(resolve(outside, "secret.md"), "outside");
    symlinkSync(
      resolve(outside, "secret.md"),
      resolve(root, "authorities/linked.md"),
    );
    const result = canonicalRepositoryReadPath(root, "authorities/linked.md");
    expect(Either.isLeft(result)).toBe(true);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("rejects an external prospective output and an escaping output symlink", () => {
  const root = mkdtempSync(resolve(tmpdir(), "raw-swarm-output-path-"));
  const outside = mkdtempSync(resolve(tmpdir(), "raw-swarm-output-outside-"));
  try {
    mkdirSync(resolve(root, "outputs"));
    writeFileSync(resolve(outside, "existing.json"), "outside");
    symlinkSync(
      resolve(outside, "existing.json"),
      resolve(root, "outputs/linked.json"),
    );
    expect(
      Either.isLeft(
        canonicalRepositoryOutputPath(root, resolve(outside, "new.json")),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(canonicalRepositoryOutputPath(root, "outputs/linked.json")),
    ).toBe(true);
    expect(
      Either.isRight(canonicalRepositoryOutputPath(root, "outputs/new.json")),
    ).toBe(true);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});
