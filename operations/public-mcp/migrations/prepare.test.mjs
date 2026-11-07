import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { loadCaptureModules } from "./prepare.mjs";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("capture modules come from the manifest commit with exact bytes", async (t) => {
  const repository = mkdtempSync(join(tmpdir(), "migration-capture-"));
  t.after(() => rmSync(repository, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync("git", args, { cwd: repository, encoding: "utf8" }).trim();
  git("init", "--quiet");
  git("config", "user.email", "capture-test@example.invalid");
  git("config", "user.name", "Capture regression");
  mkdirSync(join(repository, "packages/mcp/src"), { recursive: true });
  const modules = [
    {
      path: "packages/mcp/src/play-session-continuation.ts",
      bytes: Buffer.from("\nexport const continuation = 1;\n\n"),
    },
    {
      path: "packages/mcp/src/continuation-graph.ts",
      bytes: Buffer.from("  export const graph = 1;\r\n"),
    },
  ];
  for (const { path, bytes } of modules)
    writeFileSync(join(repository, path), bytes);
  git("add", ".");
  git("commit", "--quiet", "-m", "Capture modules");
  const manifest = {
    captureRevision: git("rev-parse", "HEAD"),
    captureModules: Object.fromEntries(
      modules.map(({ path, bytes }) => [path, sha256(bytes)]),
    ),
  };
  writeFileSync(join(repository, modules[1].path), "export const graph = 2;\n");
  git("add", ".");
  git("commit", "--quiet", "-m", "Change serving graph");
  writeFileSync(
    join(repository, modules[0].path),
    "uncommitted serving bytes\n",
  );

  await t.test(
    "later HEAD and working tree changes preserve pinned bytes",
    () => {
      assert.notEqual(git("rev-parse", "HEAD"), manifest.captureRevision);
      const captured = loadCaptureModules(repository, manifest);
      assert.deepEqual(captured, modules);
      for (const { path, bytes } of captured)
        assert.equal(sha256(bytes), manifest.captureModules[path]);
    },
  );

  await t.test("revision requires a full commit identity", () => {
    for (const captureRevision of [
      undefined,
      "HEAD",
      manifest.captureRevision.slice(0, 12),
    ])
      assert.throws(
        () => loadCaptureModules(repository, { ...manifest, captureRevision }),
        /Capture revision must identify an available full commit/,
      );
    const blob = git(
      "rev-parse",
      `${manifest.captureRevision}:${modules[0].path}`,
    );
    assert.throws(
      () =>
        loadCaptureModules(repository, { ...manifest, captureRevision: blob }),
      /Capture revision must identify an available full commit/,
    );
  });

  await t.test("unavailable commit stops loading", () => {
    assert.throws(
      () =>
        loadCaptureModules(repository, {
          ...manifest,
          captureRevision: "f".repeat(40),
        }),
      /git cat-file failed/,
    );
  });

  await t.test("missing or mismatched hash stops loading", () => {
    for (const hash of [undefined, "0".repeat(64)])
      assert.throws(
        () =>
          loadCaptureModules(repository, {
            ...manifest,
            captureModules: {
              ...manifest.captureModules,
              [modules[1].path]: hash,
            },
          }),
        /Capture module hash mismatch/,
      );
  });

  await t.test("missing committed module stops loading", () => {
    writeFileSync(join(repository, modules[0].path), modules[0].bytes);
    rmSync(join(repository, modules[1].path));
    git("add", ".");
    git("commit", "--quiet", "-m", "Remove capture graph");
    assert.throws(
      () =>
        loadCaptureModules(repository, {
          ...manifest,
          captureRevision: git("rev-parse", "HEAD"),
        }),
      /Capture module unavailable/,
    );
  });
});
