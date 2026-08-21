import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import {
  matchedCallCountFromReplayOutput,
  retainReplayResultEvidence,
} from "./replay-sdk-player.ts";
import { rawSwarmTestOutputDirectory } from "./test-output.ts";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

const evidence = {
  type: "raw-swarm-sdk-replay-result" as const,
  schemaVersion: 1 as const,
  scenarioId: "replay-example",
  transcriptSha256: "a".repeat(64),
  replaySupervisorSha256: "b".repeat(64),
  matchedCallCount: 4,
  status: "succeeded" as const,
};

describe("SDK replay result authority", () => {
  test("requires the supervisor's exact matched call count", () => {
    expect(
      matchedCallCountFromReplayOutput(
        "SDK player replay deterministic: 4 call(s) matched.\n",
        4,
      ),
    ).toBe(4);
    expect(() =>
      matchedCallCountFromReplayOutput(
        "SDK player replay deterministic: 3 call(s) matched.\n",
        4,
      ),
    ).toThrow(/reported 3 matched calls/);
    expect(() => matchedCallCountFromReplayOutput("unexpected\n", 4)).toThrow(
      /did not report a deterministic success/,
    );
  });

  test("retains an immutable replay-result authority", () => {
    const directory = rawSwarmTestOutputDirectory("replay-result-test-");
    directories.push(directory);
    const path = resolve(directory, "replay-result.json");
    retainReplayResultEvidence({ path, evidence });
    const first = readFileSync(path, "utf8");
    retainReplayResultEvidence({ path, evidence });
    expect(readFileSync(path, "utf8")).toBe(first);
    expect(() =>
      retainReplayResultEvidence({
        path,
        evidence: { ...evidence, matchedCallCount: 5 },
      }),
    ).toThrow(/immutable replay-result authority/);
    expect(JSON.parse(first)).toEqual(evidence);
  });

  test("rejects a replay-result authority outside the repository", () => {
    const outside = mkdtempSync(resolve(tmpdir(), "raw-swarm-replay-outside-"));
    directories.push(outside);
    expect(() =>
      retainReplayResultEvidence({
        path: resolve(outside, "replay-result.json"),
        evidence,
      }),
    ).toThrow(/Replay output is not repository-owned/);
  });
});
