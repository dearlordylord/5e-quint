import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { prepareQuintEvaluator } from "./prepare-ci-quint-evaluator.mjs";

function fixture(t, binary = "#!/bin/sh\necho synthetic-evaluator-help\n") {
  const directory = mkdtempSync(join(tmpdir(), "quint-acquisition-test-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const source = join(directory, "source");
  mkdirSync(source);
  const executable = join(source, "quint_evaluator");
  writeFileSync(executable, binary);
  chmodSync(executable, 0o755);
  const archive = join(directory, "synthetic-evaluator.tar.gz");
  execFileSync("tar", ["-czf", archive, "-C", source, "quint_evaluator"]);
  const release = {
    version: "v-synthetic-test",
    repository: "synthetic/evaluator",
    assetName: "synthetic-evaluator.tar.gz",
    sha256: createHash("sha256").update(readFileSync(archive)).digest("hex"),
  };
  const calls = [];
  const execute = (command, args, options) => {
    calls.push({ command, args, options });
    if (command === "gh") {
      copyFileSync(
        archive,
        join(args[args.indexOf("--dir") + 1], release.assetName),
      );
      return Buffer.alloc(0);
    }
    return execFileSync(command, args, options);
  };
  return {
    archive,
    binary,
    calls,
    directory,
    input: {
      release,
      installedEvaluatorVersion: release.version,
      evaluatorDirectory: join(
        directory,
        "quint-home",
        `rust-evaluator-${release.version}`,
      ),
      githubToken: "synthetic-test-token",
      execute,
      pause: async () => {},
    },
  };
}

test("verified official-format archive replaces an untrusted existing cache binary", async (t) => {
  const { input, binary, calls } = fixture(t);
  mkdirSync(input.evaluatorDirectory, { recursive: true });
  const destination = join(input.evaluatorDirectory, "quint_evaluator");
  writeFileSync(destination, "untrusted-existing-binary");
  assert.equal(await prepareQuintEvaluator(input), destination);
  assert.equal(readFileSync(destination, "utf8"), binary);
  assert.match(
    execFileSync(destination, ["--help"], { encoding: "utf8" }),
    /synthetic-evaluator-help/,
  );
  const download = calls.find((call) => call.command === "gh");
  assert.equal(download.options.env.GH_TOKEN, input.githubToken);
  assert.ok(download.args.includes(`evaluator/${input.release.version}`));
  assert.ok(
    calls.find(
      (call) =>
        call.command.endsWith("quint_evaluator") && call.args[0] === "--help",
    ),
  );
});

test("an installed evaluator version change fails before download or cache mutation", async (t) => {
  const { input, calls } = fixture(t);
  await assert.rejects(
    prepareQuintEvaluator({ ...input, installedEvaluatorVersion: "v-other" }),
    /review its release asset and digest/,
  );
  assert.equal(calls.length, 0);
  assert.equal(existsSync(input.evaluatorDirectory), false);
});

test("a digest mismatch prevents extraction, execution and cache publication", async (t) => {
  const { input, archive, calls } = fixture(t);
  writeFileSync(archive, "tampered archive");
  await assert.rejects(prepareQuintEvaluator(input), /reviewed SHA-256 digest/);
  assert.deepEqual(
    calls.map((call) => call.command),
    ["gh"],
  );
  assert.equal(existsSync(input.evaluatorDirectory), false);
});

test("a verified archive whose evaluator cannot start is never published", async (t) => {
  const { input } = fixture(t, "#!/bin/sh\nexit 3\n");
  await assert.rejects(prepareQuintEvaluator(input));
  assert.equal(existsSync(input.evaluatorDirectory), false);
});

test("authentication is required before acquisition", async (t) => {
  const { input, calls } = fixture(t);
  await assert.rejects(
    prepareQuintEvaluator({ ...input, githubToken: undefined }),
    /requires GH_TOKEN/,
  );
  assert.equal(calls.length, 0);
});

test("download failures have three bounded attempts and do not expose child diagnostics", async (t) => {
  const { input } = fixture(t);
  let attempts = 0;
  const pauses = [];
  await assert.rejects(
    prepareQuintEvaluator({
      ...input,
      execute: () => {
        attempts += 1;
        throw new Error(input.githubToken);
      },
      pause: async (milliseconds) => {
        pauses.push(milliseconds);
      },
    }),
    (error) => {
      assert.match(error.message, /failed after 3 attempts/);
      assert.equal(error.message.includes(input.githubToken), false);
      return true;
    },
  );
  assert.equal(attempts, 3);
  assert.deepEqual(pauses, [1000, 2000]);
});
