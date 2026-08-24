import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { artifactAuthority } from "./artifact-authority.ts";
import {
  compareControlledExecutions,
  readControlledPerformance,
  summarizeControlledExecution,
} from "./performance-comparison.ts";
import { controlledReviewEvidenceFixture } from "./review-invocation-evidence.test-support.ts";
import { rawSwarmTestOutputDirectory } from "./test-output.ts";
import { sha256Canonical, sha256Text } from "./transcript.ts";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe("whole-path performance evidence", () => {
  test("aggregates invocation usage and refuses incomparable legacy token claims", () => {
    const directory = rawSwarmTestOutputDirectory("performance-test-");
    temporaryDirectories.push(directory);
    const entry = (
      phase: "player" | "postPlayReview",
      input: number,
      invocationId: string,
    ) =>
      ({
        schemaVersion: 4,
        phase,
        stagePlanReason: `The fixture ${phase} stage requires this invocation.`,
        invocationId,
        model: phase === "player" ? "gpt-5.6-sol" : "gpt-5.6-luna",
        reasoningEffort: phase === "player" ? "medium" : "max",
        startedAt: "2026-08-14T00:00:00.000Z",
        elapsedMilliseconds: 1_000,
        exit: { tag: "exited", status: 0 },
        result: { tag: "succeeded" },
        usage: {
          tag: "available",
          input: { tag: "available", count: input },
          cachedInput: { tag: "available", count: 10 },
          cacheWriteInput: { tag: "available", count: 0 },
          output: { tag: "available", count: 100 },
          reasoningOutput: { tag: "available", count: 50 },
        },
      }) as const;
    const fixture = controlledReviewEvidenceFixture({
      directory,
      callCount: 2,
      ledgerEntries: [
        entry("player", 900, "player-conversation"),
        entry("postPlayReview", 400, "post-play-review"),
      ],
    });
    const transcript = fixture.transcriptPath;
    const review = fixture.reviewPath;
    const transcriptHeaderSha256 = sha256Canonical(fixture.header);
    const observations = resolve(directory, "observations.jsonl");
    writeFileSync(
      observations,
      [1, 2]
        .map((continuation) =>
          JSON.stringify({
            transcriptHeaderSha256,
            continuation,
            kind: "continue",
          }),
        )
        .join("\n") + "\n",
    );
    const timings = resolve(directory, "timings.jsonl");
    const writeSupervisorTimings = (headerSha256: string): void => {
      writeFileSync(
        timings,
        [1, 2]
          .map((continuation) =>
            JSON.stringify({
              schemaVersion: 1,
              transcriptHeaderSha256: headerSha256,
              continuation,
              phases: {
                continuationTypecheckMilliseconds: 5,
                priorCallVerificationReplayMilliseconds: 10,
                newSdkExecutionMilliseconds: 15,
                evidenceWritingMilliseconds: 20,
              },
            }),
          )
          .join("\n") + "\n",
      );
    };
    writeSupervisorTimings(transcriptHeaderSha256);
    const reportingTiming = resolve(directory, "reporting-timing.json");
    const reportingManifest = resolve(directory, "manifest.json");
    const indexSha256 = "1".repeat(64);
    const writeReportingTiming = (elapsedMilliseconds: number): void => {
      writeFileSync(
        reportingTiming,
        `${JSON.stringify({ schemaVersion: 1, operations: ["ingest", "review", "portableExport"], runId: 1, transcriptSha256: sha256Text(readFileSync(transcript, "utf8")), reviewSha256: sha256Text(readFileSync(review, "utf8")), indexSha256, elapsedMilliseconds })}\n`,
      );
      const timingBytes = readFileSync(reportingTiming);
      writeFileSync(
        reportingManifest,
        `${JSON.stringify({ schemaVersion: 1, index: { sha256: indexSha256 }, artifacts: [{ path: "reporting-timing.json", sha256: sha256Text(timingBytes.toString("utf8")), byteLength: timingBytes.byteLength }] })}\n`,
      );
    };
    writeReportingTiming(50);
    const summary = summarizeControlledExecution({
      schemaVersion: 1,
      reviewInvocationEvidencePath: fixture.manifestPath,
      continuationObservationPath: observations,
      supervisorTimingPath: timings,
      reportingTimingPath: reportingTiming,
      reportingManifestPath: reportingManifest,
    });
    expect(summary.phases.player.usage).toMatchObject({
      tag: "available",
      totals: { inputPlusOutput: 1_000 },
    });
    expect(summary.phases.player.invocationCount).toBe(1);
    expect(summary.continuations).toBe(2);
    expect(summary.sources.prePlayReviews).toMatchObject([
      {
        reviewStage: "milestone",
        sourceInput: { byteLength: expect.any(Number) },
        replayInput: { byteLength: expect.any(Number) },
      },
      {
        reviewStage: "final",
        sourceInput: { byteLength: expect.any(Number) },
        replayInput: { byteLength: expect.any(Number) },
      },
    ]);
    expect(summary.supervisor).toMatchObject({
      replayMilliseconds: 20,
      nonModelMilliseconds: 100,
      perContinuationMilliseconds: 50,
      perCallMilliseconds: 50,
      replayCacheDecision: { admitted: false },
    });
    writeSupervisorTimings("f".repeat(64));
    expect(() =>
      summarizeControlledExecution({
        schemaVersion: 1,
        reviewInvocationEvidencePath: fixture.manifestPath,
        continuationObservationPath: observations,
        supervisorTimingPath: timings,
        reportingTimingPath: reportingTiming,
        reportingManifestPath: reportingManifest,
      }),
    ).toThrow(/every authoritative continuation observation exactly once/);
    writeSupervisorTimings(transcriptHeaderSha256);
    expect(
      compareControlledExecutions(
        {
          schemaVersion: 1,
          scenarioId: "same",
          scenarioSha256: fixture.header.scenarioSha256,
          scenarioReviewSha256: fixture.header.scenarioReviewSha256,
          charactersSha256: fixture.header.charactersSha256,
          setupSha256: fixture.header.setupSha256,
          calls: 2,
          continuations: 2,
          player: {
            model: "gpt-5.6-sol",
            reasoningEffort: "medium",
            footerTokens: 2_000,
            elapsedMilliseconds: 3_000,
          },
          postPlayReview: {
            model: "gpt-5.6-luna",
            reasoningEffort: "max",
            footerTokens: 2_000,
            elapsedMilliseconds: 3_000,
          },
          wholePathElapsedMilliseconds: 10_000,
        },
        summary,
      ),
    ).toMatchObject({
      identity: "same-scenario",
      packetBasedPostPlayTokens: { tag: "incomparable" },
      packetBasedPostPlayWall: { tag: "comparable", passes: true },
      comparablePathTokens: { tag: "incomparable" },
      comparablePathWall: {
        tag: "incomparable",
        reason:
          "Legacy whole-path timing has no per-phase model identity or invocation-count authority.",
      },
      playerNormalizedTokens: { tag: "incomparable" },
    });

    const withUsage = (
      phase: typeof summary.phases.player,
      inputPlusOutput: number,
    ) => ({
      ...phase,
      usage: {
        tag: "available" as const,
        totals: {
          input: inputPlusOutput - 100,
          cachedInput: 0,
          cacheWriteInput: 0,
          output: 100,
          reasoningOutput: 50,
          inputPlusOutput,
        },
      },
    });
    const availableLunaPhase = {
      invocationCount: 1,
      elapsedMilliseconds: 100,
      models: ["gpt-5.6-luna"],
      reasoningEfforts: ["max"],
      usage: {
        tag: "available" as const,
        totals: {
          input: 90,
          cachedInput: 0,
          cacheWriteInput: 0,
          output: 10,
          reasoningOutput: 5,
          inputPlusOutput: 100,
        },
      },
    };
    const freshControlled = {
      ...summary,
      phases: {
        ...summary.phases,
        scenarioCompositeReview: availableLunaPhase,
        scenarioReadiness: availableLunaPhase,
      },
    };
    const controlledBaseline = {
      ...freshControlled,
      phases: {
        ...freshControlled.phases,
        scenarioCompositeReview: {
          ...availableLunaPhase,
          invocationCount: 4,
          elapsedMilliseconds: 400,
        },
        player: withUsage(summary.phases.player, 2_000),
        postPlayReview: {
          ...withUsage(summary.phases.postPlayReview, 1_500),
          elapsedMilliseconds: 3_000,
        },
      },
      comparablePathElapsedMilliseconds: 6_000,
      normalizedTokens: {
        ...summary.normalizedTokens,
        player: {
          tag: "available" as const,
          perInvocation: 2_000,
          perContinuation: 1_000,
          perCall: 1_000,
        },
      },
    };
    expect(
      compareControlledExecutions(controlledBaseline, freshControlled),
    ).toMatchObject({
      packetBasedPostPlayTokens: { tag: "comparable", passes: true },
      packetBasedPostPlayWall: { tag: "comparable", passes: true },
      comparablePathTokens: { tag: "comparable", passes: true },
      comparablePathWall: { tag: "comparable", passes: true },
      playerNormalizedTokens: { tag: "comparable", passes: true },
    });
    expect(
      compareControlledExecutions(
        {
          ...controlledBaseline,
          phases: {
            ...controlledBaseline.phases,
            player: {
              ...controlledBaseline.phases.player,
              invocationCount: 2,
            },
          },
        },
        freshControlled,
      ),
    ).toMatchObject({
      comparablePathTokens: { tag: "comparable" },
      comparablePathWall: { tag: "comparable" },
      playerNormalizedTokens: { tag: "comparable" },
    });
    expect(
      compareControlledExecutions(
        {
          ...controlledBaseline,
          charactersSha256: "9".repeat(64),
        },
        freshControlled,
      ),
    ).toMatchObject({
      identity: "different-scenario",
      packetBasedPostPlayTokens: { tag: "incomparable" },
      comparablePathTokens: { tag: "incomparable" },
      comparablePathWall: { tag: "incomparable" },
      playerNormalizedTokens: { tag: "incomparable" },
    });

    const summaryPath = resolve(directory, "summary.json");
    writeFileSync(summaryPath, `${JSON.stringify(summary)}\n`);
    expect(readControlledPerformance(summaryPath)).toEqual(summary);

    const rawPath = resolve(directory, "unmanifested-invocation.codex-raw");
    const rawContents = "synthetic raw invocation output\n";
    writeFileSync(rawPath, rawContents);
    const rawAuthority = artifactAuthority(rawPath);
    const summaryWithRawAuthority = {
      ...summary,
      sources: {
        ...summary.sources,
        invocationRawArtifacts: [rawAuthority],
      },
    };
    writeFileSync(summaryPath, `${JSON.stringify(summaryWithRawAuthority)}\n`);
    rmSync(rawPath);
    expect(() => readControlledPerformance(summaryPath)).toThrow(
      /inconsistent derivations/,
    );
    writeFileSync(rawPath, rawContents);
    expect(() => readControlledPerformance(summaryPath)).toThrow(
      /raw invocation artifact authorities that do not match its review invocation manifest/,
    );
    writeFileSync(rawPath, "tampered raw invocation output\n");
    expect(() => readControlledPerformance(summaryPath)).toThrow(
      /inconsistent derivations/,
    );
    writeFileSync(summaryPath, `${JSON.stringify(summary)}\n`);
    writeFileSync(
      summaryPath,
      `${JSON.stringify({
        ...summary,
        phases: {
          ...summary.phases,
          player: { ...summary.phases.player, invocationCount: 0 },
        },
      })}\n`,
    );
    expect(() => readControlledPerformance(summaryPath)).toThrow(
      /require at least one player invocation/,
    );
    const contradictorySummary = {
      ...summary,
      phases: {
        ...summary.phases,
        player: {
          ...summary.phases.player,
          usage: {
            tag: "available" as const,
            totals: {
              ...(summary.phases.player.usage.tag === "available"
                ? summary.phases.player.usage.totals
                : {
                    input: 0,
                    cachedInput: 0,
                    cacheWriteInput: 0,
                    output: 0,
                    reasoningOutput: 0,
                    inputPlusOutput: 0,
                  }),
              inputPlusOutput: 123,
            },
          },
        },
      },
    };
    writeFileSync(summaryPath, `${JSON.stringify(contradictorySummary)}\n`);
    expect(() => readControlledPerformance(summaryPath)).toThrow(
      /inconsistent derivations/,
    );
    writeFileSync(summaryPath, `${JSON.stringify(summary)}\n`);
    writeReportingTiming(51);
    expect(() => readControlledPerformance(summaryPath)).toThrow(
      /inconsistent derivations/,
    );
    writeReportingTiming(50);

    writeFileSync(
      timings,
      `${JSON.stringify({
        schemaVersion: 1,
        transcriptHeaderSha256,
        continuation: 1,
        phases: {
          continuationTypecheckMilliseconds: 1.5,
          priorCallVerificationReplayMilliseconds: 20,
          newSdkExecutionMilliseconds: 30,
          evidenceWritingMilliseconds: 40,
        },
      })}\n`,
    );
    expect(() =>
      summarizeControlledExecution({
        schemaVersion: 1,
        reviewInvocationEvidencePath: fixture.manifestPath,
        continuationObservationPath: observations,
        supervisorTimingPath: timings,
        reportingTimingPath: reportingTiming,
        reportingManifestPath: reportingManifest,
      }),
    ).toThrow(/invalid phase durations/);
    writeFileSync(
      timings,
      `${JSON.stringify({
        schemaVersion: 1,
        transcriptHeaderSha256,
        continuation: 1,
        phases: {
          continuationTypecheckMilliseconds: 10,
          priorCallVerificationReplayMilliseconds: 20,
          newSdkExecutionMilliseconds: 30,
          evidenceWritingMilliseconds: 40,
        },
      })}\n`,
    );
    expect(() =>
      summarizeControlledExecution({
        schemaVersion: 1,
        reviewInvocationEvidencePath: fixture.manifestPath,
        continuationObservationPath: observations,
        supervisorTimingPath: timings,
        reportingTimingPath: reportingTiming,
        reportingManifestPath: reportingManifest,
      }),
    ).toThrow(/every authoritative continuation observation exactly once/);
  });
});
