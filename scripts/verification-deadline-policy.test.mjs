import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { readVerificationDeadlinePolicy } from "./verification-deadline-policy.mjs";

test("verification deadline policy is finite by default and independently configurable", () => {
  assert.deepEqual(readVerificationDeadlinePolicy({}), {
    acquisitionMs: 7_200_000,
    executionMs: 28_800_000,
    stageMs: 7_200_000,
  });
  assert.deepEqual(
    readVerificationDeadlinePolicy({
      DND_VERIFICATION_STAGE_TIMEOUT_MS: "123",
    }),
    { acquisitionMs: 7_200_000, executionMs: 28_800_000, stageMs: 123 },
  );
});

test("every deadline rejects absent limits and unsafe or malformed durations", () => {
  for (const variable of [
    "DND_VERIFICATION_LOCK_ACQUISITION_TIMEOUT_MS",
    "DND_VERIFICATION_EXECUTION_TIMEOUT_MS",
    "DND_VERIFICATION_STAGE_TIMEOUT_MS",
  ]) {
    for (const value of [
      "",
      "none",
      "0",
      "-1",
      "1.5",
      "Infinity",
      " 12",
      "12ms",
      "604800001",
      "9007199254740992",
    ]) {
      assert.throws(
        () => readVerificationDeadlinePolicy({ [variable]: value }),
        new RegExp(variable),
      );
    }
  }
});

test("shell policy reports validated decimal values and rejects before output", () => {
  const path = new URL("./verification-deadline-policy.mjs", import.meta.url);
  const valid = spawnSync(process.execPath, [path.pathname, "--shell"], {
    encoding: "utf8",
    env: {},
  });
  assert.equal(valid.status, 0);
  assert.equal(valid.stdout, "7200000\n28800000\n7200000\n");
  const invalid = spawnSync(process.execPath, [path.pathname, "--shell"], {
    encoding: "utf8",
    env: { DND_VERIFICATION_STAGE_TIMEOUT_MS: "none" },
  });
  assert.equal(invalid.status, 64);
  assert.equal(invalid.stdout, "");
});
