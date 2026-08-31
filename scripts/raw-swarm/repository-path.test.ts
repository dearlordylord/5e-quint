import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { Result } from "effect";
import { expect, test } from "vitest";

import { readRunnerOwnedJsonLines } from "./artifact-authority.ts";
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
    expect(Result.isFailure(result)).toBe(true);
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
      Result.isFailure(
        canonicalRepositoryOutputPath(root, resolve(outside, "new.json")),
      ),
    ).toBe(true);
    expect(
      Result.isFailure(
        canonicalRepositoryOutputPath(root, "outputs/linked.json"),
      ),
    ).toBe(true);
    expect(
      Result.isSuccess(canonicalRepositoryOutputPath(root, "outputs/new.json")),
    ).toBe(true);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("reads runner-owned JSONL outside the repository without admitting an escaping symlink", () => {
  const runnerRoot = mkdtempSync(resolve(tmpdir(), "raw-swarm-runner-owned-"));
  const outside = mkdtempSync(resolve(tmpdir(), "raw-swarm-runner-outside-"));
  try {
    const evidence = resolve(runnerRoot, "evidence.jsonl");
    const outsideEvidence = resolve(outside, "outside.jsonl");
    const linkedEvidence = resolve(runnerRoot, "linked.jsonl");
    writeFileSync(evidence, '{"type":"retained"}\n');
    writeFileSync(outsideEvidence, '{"type":"outside"}\n');
    symlinkSync(outsideEvidence, linkedEvidence);

    expect(readRunnerOwnedJsonLines(runnerRoot, evidence)).toEqual([
      { type: "retained" },
    ]);
    expect(() => readRunnerOwnedJsonLines(runnerRoot, linkedEvidence)).toThrow(
      /Runner-owned authority symlink escapes its owner root/,
    );
  } finally {
    rmSync(runnerRoot, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});
